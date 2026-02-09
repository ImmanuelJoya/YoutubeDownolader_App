from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
import uuid
from pathlib import Path

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
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            formats = []
            # Filter for audio and video formats
            for f in info.get('formats', []):
                if f.get('vcodec') != 'none' or f.get('acodec') != 'none':
                    formats.append({
                        'format_id': f['format_id'],
                        'ext': f['ext'],
                        'quality': f.get('quality_label', 'audio'),
                        'filesize': f.get('filesize') or f.get('filesize_approx'),
                        'vcodec': f.get('vcodec'),
                        'acodec': f.get('acodec')
                    })
            
            return {
                'title': info['title'],
                'author': info.get('uploader'),
                'duration': info['duration'],
                'thumbnail': info.get('thumbnail'),
                'uploader': info.get('uploader'),
                'formats': formats[:20]  # Limit to first 20 formats
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