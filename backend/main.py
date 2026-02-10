from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
import uuid
from pathlib import Path
from fastapi.responses import StreamingResponse
import mimetypes
from fastapi.responses import FileResponse

app = FastAPI(title="YouTube Downloader API")

# Allow mobile app to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app URL
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = Path("downloads")
DOWNLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
def read_root():
    return {"status": "Server is running"}

@app.get("/info")
async def get_video_info(url: str):
    """Get video info and available formats"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get best thumbnail (usually the last/highest res)
            thumbnails = info.get('thumbnails', [])
            thumbnail_url = None
            if thumbnails:
                # Try to get the highest resolution thumbnail
                thumbnail_url = thumbnails[-1].get('url')
            if not thumbnail_url:
                thumbnail_url = info.get('thumbnail')
            
            # Clean up formats for better display
            formats = []
            seen_qualities = set()
            
            for f in info.get('formats', []):
                # Skip duplicate qualities
                quality_key = f"{f.get('quality_label', 'audio')}_{f.get('ext')}"
                if quality_key in seen_qualities:
                    continue
                seen_qualities.add(quality_key)
                
                # Determine format type
                is_video = f.get('vcodec') != 'none'
                is_audio = f.get('acodec') != 'none'
                
                format_type = "unknown"
                if is_video and is_audio:
                    format_type = "video+audio"
                elif is_video:
                    format_type = "video only"
                elif is_audio:
                    format_type = "audio only"
                
                # Calculate filesize
                filesize = f.get('filesize') or f.get('filesize_approx', 0)
                
                formats.append({
                    'format_id': f['format_id'],
                    'ext': f['ext'],
                    'quality': f.get('quality_label', f.get('height', 'audio')),
                    'format_type': format_type,
                    'filesize': filesize,
                    'vcodec': f.get('vcodec'),
                    'acodec': f.get('acodec'),
                    'abr': f.get('abr'),  # audio bitrate
                    'vbr': f.get('vbr'),  # video bitrate
                })
            
            # Sort formats: best quality first, prioritize video+audio
            formats.sort(key=lambda x: (
                x['format_type'] != 'video+audio',
                x['filesize'] or 0
            ), reverse=True)
            
            return {
                'title': info.get('title', 'Unknown Title'),
                'uploader': info.get('uploader', 'Unknown Artist'),
                'duration': info.get('duration', 0),
                'thumbnail': thumbnail_url,
                'description': info.get('description', '')[:200],  # First 200 chars
                'view_count': info.get('view_count'),
                'upload_date': info.get('upload_date'),
                'formats': formats[:15]  # Limit to top 15 formats
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    
@app.post("/download")
async def download_video(url: str, format_id: str):
    """Download video/audio to server"""
    try:
        download_id = str(uuid.uuid4())[:8]
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': str(DOWNLOAD_DIR / f'{download_id}_%(title)s.%(ext)s'),
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
        return {
            'download_id': download_id,
            'filename': os.path.basename(filename),
            'status': 'completed'
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/download-file/{filename}")
async def download_file(filename: str):
    """Stream file for mobile download"""
    file_path = DOWNLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    def iterfile():
        with open(file_path, "rb") as f:
            yield from f
    
    return StreamingResponse(
        iterfile(),
        media_type=mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@app.get("/file/{filename}")
async def get_file(filename: str):
    """Download file from server to phone"""
    file_path = DOWNLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

@app.get("/file/{filename}")
async def get_file(filename: str):
    """Download file from server"""
    file_path = DOWNLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)