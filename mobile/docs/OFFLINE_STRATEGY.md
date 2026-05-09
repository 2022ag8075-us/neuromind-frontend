# Offline Strategy

- **Chat sessions** are cached in AsyncStorage (`NEUROMIND_SESSIONS` key) and loaded immediately when the app starts.
- **Offline messages** are queued in `NEUROMIND_OFFLINE_QUEUE` and sent when connectivity returns (handled by `processQueue` in `ChatContext`).
- **Network status** is monitored via `@react-native-community/netinfo` – a red banner shows when offline.