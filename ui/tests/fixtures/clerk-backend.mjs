export async function verifyToken(token) {
  if (!token.startsWith('fixture:')) throw new Error('Invalid fixture token');
  return { sub: token.slice(8) };
}
export function createClerkClient() {
  return { users: { getUser: async (scenario) => ({
    id: 'user_private',
    primaryEmailAddressId: scenario === 'missing-primary' ? 'missing' : 'primary',
    emailAddresses: [
      { id: 'primary', emailAddress: scenario === 'non-gatech' ? 'private@example.com' : 'student@gatech.edu', verification: { status: scenario === 'unverified' ? 'unverified' : 'verified' } },
      { id: 'secondary', emailAddress: 'other@gatech.edu', verification: { status: 'verified' } },
    ],
  }) } };
}
