const deleted = new Set();
const failedOnce = new Set();
export async function verifyToken(token) {
  if (!token.startsWith('fixture:')) throw new Error('Invalid fixture token');
  return { sub: token.slice(8) };
}
export function createClerkClient() {
  return { users: { deleteUser: async (id) => {
    if (id === 'user_account-deletion-retry' && !failedOnce.has(id)) {
      failedOnce.add(id);
      throw new Error('Temporary Clerk outage');
    }
    deleted.add(id); return { id, deleted: true };
  }, getUser: async (scenario) => {
    if (deleted.has(scenario) || deleted.has(`user_${scenario}`)) throw Object.assign(new Error('User deleted'), { status: 404 });
    return ({
    id: `user_${scenario}`,
    primaryEmailAddressId: scenario === 'missing-primary' ? 'missing' : 'primary',
    emailAddresses: [
      { id: 'primary', emailAddress: scenario === 'non-gatech' ? 'private@example.com' : 'student@gatech.edu', verification: { status: scenario === 'unverified' ? 'unverified' : 'verified' } },
      { id: 'secondary', emailAddress: 'other@gatech.edu', verification: { status: 'verified' } },
    ],
  }); } } };
}
