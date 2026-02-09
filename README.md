## Work Flow
- User pastes URL → React Native
- App sends to Python backend API
- Backend runs yt-dlp to fetch metadata (formats, titles)
- User selects quality → backend downloads to server
- File streams or transfers to phone storage

## Project Structure
```bash
youtube-downloader-app/
├── backend/                 # FastAPI server
│   ├── main.py
│   ├── requirements.txt
│   └── downloads/          # Temporary storage
└── mobile/
├── App.js                 # Main entry (we'll rebuild this)
├── src/
│   ├── components/        # Reusable UI parts
│   ├── screens/           # App screens
│   ├── api/               # Backend communication
│   └── utils/             # Helpers
└── package.json
```