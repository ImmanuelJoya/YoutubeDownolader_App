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
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigation config (exists)
│   │   ├── index.tsx        # Home tab - we'll rebuild this
│   │   └── explore.tsx      # Explore tab (exists)
│   └── _layout.tsx          # Root layout (exists)
├── src/
│   ├── api/
│   │   └── client.js        # API client
│   └── components/
│       └── VideoDownloader.tsx  # Main component
└── package.json
```