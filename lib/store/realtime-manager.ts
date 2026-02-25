// No-op: Supabase Realtime removed. Firestore onSnapshot not yet implemented.
export class RealtimeManager {
  async connect(_userId: string): Promise<void> {}
  async disconnect(): Promise<void> {}
}
