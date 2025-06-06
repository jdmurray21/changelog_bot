import anthropic
import json
from datetime import datetime
from typing import Dict, List, Optional
import requests
import re
from app.exceptions import ChangelogError
from typing_extensions import TypedDict
import logging
from app.core.config import settings

# Configure logging (moved to config)
logger = logging.getLogger(__name__)

class CommitData(TypedDict):
    sha: str
    github_url: str
    changes_summary: str
    truncated_diff: str

# Initialize Claude client
anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Constants from config
MAX_TOKENS_PER_REQUEST = settings.MAX_TOKENS_PER_REQUEST
MAX_CHANGES_PER_FILE = settings.MAX_CHANGES_PER_FILE

class ChangelogGenerator:
    def __init__(self):
        self.model = "claude-sonnet-4-20250514"
        self.system_prompt = """
        You are a professional changelog generator for developer tools.
        Your task is to analyze git commits and generate a concise, user-friendly changelog.
        Focus on changes that would be relevant to end-users.
        Format the output as valid JSON with the following structure:
        {
            "type": "string",  # e.g., "fix", "feature", "performance"
            "description": "string",
            "impact": "string",
            "commit_count": "integer",
            "commits": [
                {
                    "sha": "string",
                    "url": "string",  # GitHub commit URL
                    "message": "string"
                }
            ]
        }
        
        IMPORTANT: Only respond with the JSON object. Do not include any additional text or explanations.
        """
        self.github_token = settings.GITHUB_TOKEN
        if not self.github_token:
            raise ValueError("GITHUB_TOKEN not found in environment variables")

    def fetch_commit(self, repository: str, sha: str) -> CommitData:
        """Fetch a specific commit from GitHub API with validation"""
        try:
            # Validate SHA format
            if not re.match(r'^[0-9a-f]{40}$', sha):
                raise ChangelogError(
                    error_type="invalid_format",
                    message=f"Invalid commit SHA format: {sha}. Please provide a full 40-character hexadecimal string.",
                    details={
                        "sha": sha,
                        "expected_format": "40-character hexadecimal string",
                        "example": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
                    }
                )
            
            # First validate repository exists
            repo_url = f"https://api.github.com/repos/{repository}"
            headers = {
                "Accept": "application/vnd.github.v3+json"
            }
            
            # Add authentication if token is available
            if self.github_token:
                headers["Authorization"] = f"Bearer {self.github_token}"
            
            # Check if repository exists
            repo_response = requests.get(repo_url, headers=headers)
            if repo_response.status_code != 200:
                error_data = repo_response.json()
                error_msg = error_data.get('message', 'Unknown error')
                raise ChangelogError(
                    error_type="repository_not_found",
                    message=f"Repository not found: {repository}",
                    repository=repository,
                    details={
                        "error": error_msg,
                        "status_code": repo_response.status_code
                    }
                )

            # Get commit details with retry logic
            commit_url = f"https://api.github.com/repos/{repository}/commits/{sha}"
            max_retries = 3
            retry_delay = 1  # seconds
            
            for attempt in range(max_retries):
                try:
                    commit_response = requests.get(commit_url, headers=headers)
                    commit_response.raise_for_status()
                    commit_data = commit_response.json()
                    break
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 404:
                        raise ChangelogError(
                            error_type="commit_not_found",
                            message=f"Commit not found: {sha} in repository {repository}",
                            sha=sha,
                            repository=repository,
                            details={
                                "error": e.response.json().get('message', 'Not found'),
                                "status_code": e.response.status_code
                            }
                        )
                    elif e.response.status_code == 403:
                        raise ChangelogError(
                            error_type="github_rate_limit",
                            message="GitHub API rate limit exceeded",
                            details={
                                "error": e.response.json().get('message', 'Rate limit exceeded'),
                                "status_code": e.response.status_code
                            }
                        )
                    else:
                        raise ChangelogError(
                            error_type="github_api_error",
                            message=f"GitHub API error: {e.response.status_code}",
                            details={
                                "error": e.response.json().get('message', 'Unknown error'),
                                "status_code": e.response.status_code
                            }
                        )
                except requests.exceptions.RequestException as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise ChangelogError(
                            error_type="network_error",
                            message=f"Failed to fetch commit details after {max_retries} attempts",
                            details={
                                "error": str(e),
                                "attempts": max_retries,
                                "repository": repository,
                                "sha": sha
                            }
                        )
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                except json.JSONDecodeError as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise ChangelogError(
                            error_type="invalid_response",
                            message="Invalid response from GitHub API",
                            details={
                                "error": str(e),
                                "attempts": max_retries,
                                "repository": repository,
                                "sha": sha
                            }
                        )
                    logger.warning(f"Invalid response format, retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                except Exception as e:
                    raise ChangelogError(
                        error_type="unknown_error",
                        message=f"Unexpected error fetching commit details: {str(e)}",
                        details={
                            "error": str(e),
                            "repository": repository,
                            "sha": sha
                        }
                    )
            
            # Format changes summary
            files_changed = commit_data.get('files', [])
            changes_summary = []
            for file in files_changed:
                filename = file.get('filename', '')
                changes = []
                if file.get('status'):
                    changes.append(f"Status: {file['status']}")
                if file.get('additions'):
                    changes.append(f"Additions: {file['additions']} lines")
                if file.get('deletions'):
                    changes.append(f"Deletions: {file['deletions']} lines")
                if changes:
                    changes_summary.append(f"File: {filename} ({', '.join(changes)})")
            
            # Create truncated diff
            truncated_diff = []
            for file in files_changed:
                filename = file.get('filename', '')
                patch = file.get('patch', '')
                if patch:
                    # Split patch into chunks
                    lines = patch.split('\n')
                    
                    # Find the first few changes (added/removed lines)
                    changes = []
                    for line in lines:
                        if line.startswith('+') or line.startswith('-'):
                            changes.append(line)
                        if len(changes) >= MAX_CHANGES_PER_FILE:  # Show up to 5 changes per file
                            break
                    
                    # Format the changes
                    if changes:
                        change_text = '\n'.join(changes)
                        if len(changes) < len(lines):
                            change_text += "\n... (more changes not shown)"
                        truncated_diff.append(f"File: {filename}\n{change_text}")
            
            # Add both summary and truncated diff to commit data
            commit_data["changes_summary"] = "\n".join(changes_summary) if changes_summary else "\nNo changes found\n"
            commit_data["truncated_diff"] = "\n\n".join(truncated_diff) if truncated_diff else "\nNo diff available\n"
            
            return commit_data
            
        except Exception as e:
            raise ChangelogError(
                error_type="api_error",
                message=f"Failed to fetch commit details: {str(e)}",
                details={"sha": sha, "error": str(e)}
            )



    def fetch_shas_by_date_range(self, repository: str, start_date: str, end_date: str) -> List[str]:
        """
        Fetch commit SHAs within a specified date range.
        """
        try:
            # Parse dates with timezone information
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            # Add timezone information to make sure we capture the full day
            start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Convert to timestamps
            start_timestamp = start_dt.timestamp()
            end_timestamp = end_dt.timestamp()
            
            # Get repository commits with pagination
            commits_url = f"https://api.github.com/repos/{repository}/commits"
            headers = {
                "Accept": "application/vnd.github.v3+json"
            }
            
            if self.github_token:
                headers["Authorization"] = f"Bearer {self.github_token}"
            
            all_commits = []
            page = 1
            
            while True:
                params = {
                    "page": page,
                    "per_page": 100,
                    "since": start_dt.isoformat(),
                    "until": end_dt.isoformat()
                }
                
                response = requests.get(commits_url, headers=headers, params=params)
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get('message', 'Unknown error')
                    raise ChangelogError(
                        error_type="api_error",
                        message=f"Failed to fetch commits: {error_msg}",
                        details={"status_code": response.status_code, "error": error_msg}
                    )
                
                commits = response.json()
                if not commits:
                    break
                
                all_commits.extend(commits)
                page += 1
                
                # If we got fewer than per_page results, we're done
                if len(commits) < 100:
                    break
            
            # Extract SHAs from all commits
            shas = [commit['sha'] for commit in all_commits]
            
            return shas

        except ValueError as e:
            raise ChangelogError(
                error_type="invalid_input",
                message="Invalid date format",
                details={"error": str(e)}
            )
        except requests.RequestException as e:
            raise ChangelogError(
                error_type="network_error",
                message="Failed to connect to GitHub API",
                details={"error": str(e)}
            )
        except Exception as e:
            logger.error(f"Error fetching SHAs: {str(e)}")
            raise ChangelogError(
                error_type="generation_error",
                message="Failed to fetch SHAs",
                details={"error": str(e)}
            )

        try:
            # Get all commits using pagination
             # Get commits using pagination with date range filtering
            all_commits = []
            page = 1
            while True:
                # Add date range parameters to the request
                params = {
                    'page': page,
                    'per_page': 100,  # GitHub API max per page
                    'since': start_dt.isoformat(),
                    'until': end_dt.isoformat()
                }
                
                # Debug logging of API parameters
                logger.info(f"API Request Parameters: {params}")
                
                response = requests.get(commits_url, headers=headers, params=params)
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get('message', 'Unknown error')
                    logger.error(f"API Response: {response.text}")
                    raise Exception(f"Failed to fetch commits: {error_msg}")
                
                commits = response.json()
                if not commits:
                    break
                
                # Debug logging of commits received
                logger.info(f"\nReceived {len(commits)} commits from page {page}")
                for commit in commits:
                    commit_date = commit['commit']['author']['date']
                    logger.info(f"Commit {commit['sha']} date: {commit_date}")
                
                all_commits.extend(commits)
                page += 1
                
                # If we're getting fewer than 100 commits, we've likely reached the end
                if len(commits) < 100:
                    break

            # Filter commits by date range
            filtered_commits = []
            for commit in all_commits:
                # Parse the commit date with timezone
                commit_date_str = commit['commit']['author']['date']
                commit_dt = datetime.fromisoformat(commit_date_str.replace('Z', '+00:00'))
                commit_timestamp = commit_dt.timestamp()
                
                # Debug logging
                logger.info(f"\nProcessing commit: {commit['sha']}")
                logger.info(f"Commit date: {commit_dt.isoformat()}")
                logger.info(f"Commit timestamp: {commit_timestamp}")
                logger.info(f"Start timestamp: {start_timestamp}")
                logger.info(f"End timestamp: {end_timestamp}")
                logger.info(f"Is within range: {start_timestamp <= commit_timestamp <= end_timestamp}")
                
                if start_timestamp <= commit_timestamp <= end_timestamp:
                    filtered_commits.append(commit['sha'])
                    logger.info(f"Added commit: {commit['sha']} at {commit_dt.isoformat()}")
                else:
                    logger.info(f"Skipped commit: {commit['sha']} at {commit_dt.isoformat()} - outside range")

            return filtered_commits

        except Exception as e:
            error_msg = str(e)
            print(f"Error fetching commits: {error_msg}")
            raise Exception(f"Failed to fetch commits: {error_msg}")

    def generate_from_shas(self, repository: str, shas: List[str]) -> Dict:
        """
        Generate a changelog entry from multiple commit SHAs
        
        Args:
            repository: GitHub repository in format 'owner/repo'
            shas: List of commit SHAs to include in changelog
            
        Returns:
            Dict: Changelog entry with type, description, and impact
        
        Raises:
            ChangelogError: If any SHA is invalid or not found in the repository
        """
        # Validate SHAs and track errors
        invalid_shas = []
        missing_shas = []
        if invalid_shas:
            raise ChangelogError(
                error_type="invalid_format",
                message="Some SHAs have invalid format",
                invalid_shas=invalid_shas,
                details={"invalid_shas": invalid_shas}
            )
        
        if missing_shas:
            raise ChangelogError(
                error_type="not_found",
                message="Some SHAs were not found in the repository",
                missing_shas=missing_shas,
                details={"missing_shas": missing_shas}
            )
        
        # If we get here, all SHAs are valid and exist in the repository
        commits = []
        for sha in shas:
            commit_data = self.fetch_commit(repository, sha)
            commits.append(commit_data)
        
        # Create a prompt for Claude
        prompt = f"""
        You are a changelog generator. Generate a comprehensive changelog entry that summarizes multiple commits.
        
        Repository: {repository}
        
        Commits:
        """
        
        # Add each commit's details to the prompt
        for commit in commits:
            author = commit.get('author', {}).get('login', '')
            date = datetime.strptime(commit.get('commit', {}).get('author', {}).get('date', ''), '%Y-%m-%dT%H:%M:%SZ').strftime('%Y-%m-%d')
            commit_message = commit.get('commit', {}).get('message', '')
            github_url = commit.get('github_url', '')
            changes_summary = commit.get('changes_summary', '')
            
            prompt += f"""
            URL: {commit['url']}
            
            Commit SHA: {commit['sha']}
            Author: {author}
            Date: {date}
            Message: {commit_message}
            
            Changes Summary:
            {changes_summary}
            """
        
        # Create a more structured prompt with clear instructions
        prompt = """
        4. Do not include any additional text or explanations
        5. If you cannot determine the type, use "chore"
        6. If you cannot determine the impact, use "Internal improvements"
        
        Repository: " + repository + "
        
        Commits:
        """
        
        # Add each commit's details to the prompt
        for commit in commits:
            author = commit.get('author', {}).get('login', '')
            date = datetime.strptime(commit.get('commit', {}).get('author', {}).get('date', ''), '%Y-%m-%dT%H:%M:%SZ').strftime('%Y-%m-%d')
            commit_message = commit.get('commit', {}).get('message', '')
            github_url = commit.get('github_url', '')
            changes_summary = commit.get('changes_summary', '')
            
            prompt += f"""
            URL: {commit['url']}
            
            Commit SHA: {commit['sha']}
            Author: {author}
            Date: {date}
            Message: {commit_message}
            
            Changes Summary:
            {changes_summary}
            """
        
        # Generate changelog using Claude
        try:
            # Lower temperature for more consistent output
            response = anthropic_client.messages.create(
                model=self.model,
                max_tokens=MAX_TOKENS_PER_REQUEST,
                temperature=0.1,  # Lower temperature for more consistent output
                system=self.system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Get the first text block from Claude's response
            content = response.content[0].text if response.content else ""
            
            # Clean the content by removing any markdown formatting
            content = content.strip()
            
            # If content is empty or not JSON, raise an error
            if not content:
                raise ValueError("Claude's response was empty")
                
            # Try to parse the JSON
            try:
                # First try to remove markdown code block if present
                if content.startswith('```json') and content.endswith('```'):
                    # Extract content between code block markers
                    content = content[8:-3].strip()  # Remove ```json at start and ``` at end
                
                # Remove any leading/trailing whitespace
                content = content.strip()
                
                # Try to parse the JSON
                changelog = json.loads(content)
                
                # Basic validation of the JSON structure
                if not isinstance(changelog, dict):
                    raise ValueError("Response is not a JSON object")
                
                required_keys = ['type', 'description', 'impact', 'commit_count', 'commits']
                missing_keys = [k for k in required_keys if k not in changelog]
                if missing_keys:
                    raise ValueError(f"Missing required keys: {missing_keys}")
                
                # Format the commits as a collapsible list
                commit_count = len(changelog['commits'])
                changelog['commit_count'] = commit_count
                
                # Format the output with a collapsible commit list
                commit_details = []
                for commit in changelog['commits']:
                    commit_message = commit.get('message', '').split('\n')[0]  # Get first line of message
                    commit_details.append(f"""
- {commit['url']} - {commit_message}
  - SHA: {commit['sha']}
""")
                
                commit_list = '\n'.join(commit_details)
                changelog['formatted_output'] = f"""
Generated Changelog
Type: {changelog['type']}
Description: {changelog['description']}
Impact: {changelog['impact']}

Number of Commits: {commit_count}

<details>
<summary>View Commits ({commit_count} total)</summary>

{commit_list}

</details>
"""
                
                return changelog
                
            except json.JSONDecodeError as e:
                # Log the actual response we received for debugging
                logger.error(f"Invalid JSON response from Claude: {content}")
                
                # Try to fix common JSON parsing issues
                try:
                    # Try to find JSON object within the text
                    json_start = content.find('{')
                    json_end = content.rfind('}') + 1
                    if json_start != -1 and json_end != -1:
                        # Extract just the JSON object
                        json_content = content[json_start:json_end]
                        # Process commits into changelog format
                        changelog = self.process_commits(commits)
                        
                        # Add GitHub URLs to commits
                        for commit in changelog.get('commits', []):
                            if commit.get('sha'):
                                commit['github_url'] = f"https://github.com/{owner}/{repo}/commit/{commit['sha']}"

                        return changelog
                except Exception:
                    pass
                
                raise ValueError(f"Invalid JSON response from Claude: {str(e)}")
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error generating changelog: {error_msg}")
            raise Exception(f"Failed to generate changelog: {error_msg}")


            commits_url = f"https://api.github.com/repos/{repository}/commits"
            headers = {
                "Accept": "application/vnd.github.v3+json"
            }
        
            if self.github_token:
                headers["Authorization"] = f"Bearer {self.github_token}"

            try:
                # Get all commits using pagination
                all_commits = []
            except Exception as e:
                raise Exception(f"An unexpected error occurred: {str(e)}")           

            # Return the raw commit data for debugging
            return {
                "raw_commits": all_commits,
                "start_date": start_date,
                "end_date": end_date
            }

        except Exception as e:
            raise Exception(f"Failed to fetch commits: {str(e)}")