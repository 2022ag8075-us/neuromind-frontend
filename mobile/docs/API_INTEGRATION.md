# API Integration

All API calls go through `src/services/api.ts`.

## Endpoints used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | New user registration |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/chat/sessions` | Fetch user's chat sessions |
| POST | `/api/ai/unified-chat` | Send message (streaming) |

## Base URL
- Dev: `http://192.168.x.x:8080/api`
- Prod: `https://neuromind-ai-production-49c7.up.railway.app/api`

Set via `EXPO_PUBLIC_API_URL` environment variable.