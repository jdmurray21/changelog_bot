from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.changelog_generator import ChangelogGenerator
from app.models.changelog import ChangelogEntry
from app.db.session import get_db
from sqlalchemy.orm import Session
from datetime import datetime
import json
from app.exceptions import ChangelogError
from sqlalchemy import desc

router = APIRouter()
api_router = router

class GenerateChangelogRequest(BaseModel):
    repository: str
    commit_shas: List[str]

class GetCommitsByDateRequest(BaseModel):
    repository: str
    start_date: str
    end_date: str
    
@router.get("/changelog/{changelog_id}", tags=["changelog"])
def get_changelog(changelog_id: int, db: Session = Depends(get_db)):
    """
    Get a specific changelog by ID.
    """
    try:
        changelog = db.query(ChangelogEntry).filter(ChangelogEntry.id == changelog_id).first()
        if not changelog:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "Changelog not found",
                    "type": "NotFound"
                }
            )

        return {
            "success": True,
            "changelog": {
                "id": changelog.id,
                "repository": changelog.repository,
                "version": changelog.version,
                "changes": json.loads(changelog.changes),
                "author": changelog.author,
                "status": changelog.status,
                "date": changelog.date.isoformat()
            }
        }
    except Exception as e:
        print(f"Error fetching changelog: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": "DatabaseError"
            }
        )

@router.post("/commits", tags=["changelog"])
def get_commits_by_date(
    request: GetCommitsByDateRequest,
    db: Session = Depends(get_db)
):
    """
    Get commit SHAs within a specified date range.
    """
    try:
        generator = ChangelogGenerator()
        # First get the SHAs from the date range
        shas = generator.fetch_shas_by_date_range(
            request.repository,
            request.start_date,
            request.end_date
        )
        
        return {
            "success": True,
            "shas": shas
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": "GenerationError"
            }
        )

@router.post("/generate", tags=["changelog"])
def generate_changelog(
    request: GenerateChangelogRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a changelog summary for specific commits.
    """
    try:
        generator = ChangelogGenerator()
        changelog_data = generator.generate_from_shas(
            request.repository,
            request.commit_shas
        )

        # Create a new changelog entry in the database
        changelog_entry = ChangelogEntry(
            repository=request.repository,
            version="",  # TODO: Implement versioning
            changes=json.dumps(changelog_data),
            author="",  # TODO: Implement author tracking
            status="generated",
            date=datetime.utcnow()
        )
        
        db.add(changelog_entry)
        db.commit()
        db.refresh(changelog_entry)
        
        # Format the changelog data to match ViewChangelogs format
        formatted_changelog = {
            "type": changelog_data.get("type", "Unknown"),
            "date": changelog_entry.date.strftime("%b %d, %Y"),
            "description": changelog_data.get("description", "No description available"),
            "impact": changelog_data.get("impact", "No impact details"),
            "commit_count": changelog_data.get("commit_count", 0),
            "commits": [
                {
                    "sha": commit["sha"][:7],  # Shorten SHA to 7 characters
                    "message": commit["message"],
                    "url": commit["url"]
                }
                for commit in changelog_data.get("commits", [])
            ]
        }

        return {
            "success": True,
            "changelog": {
                "id": changelog_entry.id,
                "repository": changelog_entry.repository,
                "version": changelog_entry.version,
                "author": changelog_entry.author,
                "status": changelog_entry.status,
                "date": formatted_changelog["date"],
                "type": formatted_changelog["type"],
                "description": formatted_changelog["description"],
                "impact": formatted_changelog["impact"],
                "commit_count": formatted_changelog["commit_count"],
                "commits": formatted_changelog["commits"]
            }
        }
    except ChangelogError as e:
        # Handle ChangelogError specifically
        raise HTTPException(
            status_code=400,
            detail={
                "error": e.message,
                "type": e.error_type,
                "details": e.details
            }
        )
    except Exception as e:
        print(f"Unexpected error generating changelog: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": "GenerationError"
            }
        )

@router.get("/changelogs", tags=["changelog"])
def get_changelogs(
    db: Session = Depends(get_db)
):
    """
    Get all generated changelogs.
    """
    try:
        print("Fetching changelogs from database")
        changelogs = db.query(ChangelogEntry).order_by(desc(ChangelogEntry.date)).all()
        print(f"Found {len(changelogs)} changelogs")
        
        if not changelogs:
            return {
                "success": True,
                "changelogs": []
            }

        return {
            "success": True,
            "changelogs": [
                {
                    "id": changelog.id,
                    "repository": changelog.repository,
                    "version": changelog.version,
                    "changes": json.loads(changelog.changes),
                    "author": changelog.author,
                    "status": changelog.status,
                    "date": changelog.date.isoformat()
                }
                for changelog in changelogs
            ]
        }
    except Exception as e:
        print(f"Error fetching changelogs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": "DatabaseError"
            }
        )
        
        # Add error details if available
        if error_data['details'].get('errors'):
            for error in error_data['details']['errors']:
                error_messages.append(f"{error.get('type', 'error')}: {error.get('message', '')}")
        
        error_data['message'] = '\n'.join(error_messages)
        
        raise HTTPException(
            status_code=400,
            detail=error_data
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        # Add more detailed error information
        error_data = {
            "error": str(e),
            "type": type(e).__name__
        }
        if hasattr(e, 'errors') and callable(e.errors):
            error_data['validation_errors'] = e.errors()
        raise HTTPException(
            status_code=500,
            detail=error_data
        )

@router.get("/entries", tags=["changelog"])
async def get_changelog_entries(db: Session = Depends(get_db)):
    """
    Get all published changelog entries.
    """
    try:
        entries = db.query(ChangelogEntry).filter(ChangelogEntry.status == "published").all()
        return {"entries": entries}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "type": type(e).__name__
            }
        )
