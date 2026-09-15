// Stub for googleapis to allow build without the actual package.
// This is a placeholder until Google Calendar/Notion integration is completed.
// At runtime these routes will throw until the real package is installed.

module.exports = {
  google: {
    auth: {
      getClient: () => { throw new Error('googleapis stub: getClient not implemented'); },
      JWT: class { constructor() { throw new Error('googleapis stub: JWT not implemented'); } },
      GoogleAuth: class { constructor() { throw new Error('googleapis stub: GoogleAuth not implemented'); } },
    },
    calendar: {
      v3: {
        events: {
          insert: () => { throw new Error('googleapis stub: events.insert not implemented'); },
          list: () => { throw new Error('googleapis stub: events.list not implemented'); },
        },
      },
    },
  },
};
