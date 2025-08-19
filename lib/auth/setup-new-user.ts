export async function setupNewUser(userId: string, email: string) {
  // TODO: Add profiles and user_roles tables to the database schema
  // For now, we don't need to set up anything since auth.users handles the basics

  // Keeping the function signature for compatibility
  // but returning success immediately since there's nothing to set up
  console.log(`New user registered: ${email} (${userId})`)

  return { success: true }
}
