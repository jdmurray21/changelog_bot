# changelog_bot (metis)

An AI-powered tool to help developers quickly generate changelogs from git commits.
Created with the help of Windsurf.

## Features

- AI-powered changelog generation using Anthropic's Claude Sonnet 4
- GitHub commit analysis/summarization based on date range or commit SHAs
- Clean, modern interface for developers
- Automatic changelog categorization
- Local DB storage for changelog history

## Tech Stack

- Backend: FastAPI (Python)
- Frontend: React
- AI: Anthropic Claude Sonnet 4
- Database: SQLite
- Authentication: GitHub OAuth

## Design and Implementation Tradeoffs

- The app was made to be simple yet effective.
- Provided compatability with GitHub commits because GitHub is common.
- Why allow generating a changelog based on SHAs? SHAs are unique to each commit, and provide simple way for a dev to generate a changelog for a select few commits.
- Why allow generating a changelog based on date range? Another common usecase would be a dev generating a changelog based on several days of commits (up to one month). This tool provides a simple way to do this.

## Future Improvements

### Speed
- One bottleneck is fetching commit details from Github. Can add caching and batch requests to improve this.
- Another bottleneck is the API calls to Claude. Can split commits into smaller batches and process them in parallel with mutiple API calls.

## Prerequisites

- Node.js v18.x.x (LTS version)
- Python 3.11
- Homebrew (for macOS)

## Setup

1. Clone the repository 
2. Install Node.js v18:
   ```bash
   brew install node@18
   # Add Node.js v18 to your PATH
   echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Install Python and dependencies:
   ```bash
   brew install python@3.11
   # Install Anthropic package first
   pip install anthropic
   # Then install other dependencies
   python3.11 -m pip install -r requirements.txt
   ```

4. Set up environment:
   - Create a `.env` file with your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_key
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_TOKEN=your_github_token
   SQLALCHEMY_DATABASE_URI=sqlite:///./changelog.db
   ```
   - Install frontend dependencies:
   ```bash
   cd frontend
   rm -rf node_modules
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

## API Documentation

Access the API documentation at: http://localhost:8000/docs

## Project Structure

```
├── app/              # Backend application code
│   ├── api/         # API routes
│   ├── core/        # Core configuration
│   ├── models/      # Database models
│   ├── services/    # Business logic
│   └── db/          # Database configuration
├── frontend/        # React frontend application
├── .env             # Environment variables
├── main.py          # Application entry point
├── pyproject.toml   # Poetry configuration
├── requirements.txt # Python dependencies
└── README.md        # This file
```

## Usage

1. Log in with your GitHub account
2. Select a repository
3. Choose the date range for commits
4. Let the AI generate your changelog
5. Review and publish to the public changelog

## API Documentation

The backend API is documented using FastAPI's automatic documentation. Access it at `/docs` once the server is running.

## Security

- All API endpoints are protected with GitHub OAuth
- API keys are stored in environment variables
- Rate limiting is implemented for AI requests

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License
