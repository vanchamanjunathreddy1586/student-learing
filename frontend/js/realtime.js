export const subscribeToRealtime = async (channelName, eventName, callback) => {
  if (!window.supabaseClient) return null;
  return window.supabaseClient.channel(channelName).on('postgres_changes', { event: '*', schema: 'public', table: eventName }, callback).subscribe();
};
