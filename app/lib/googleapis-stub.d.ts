declare module 'googleapis' {
  namespace google {
    export interface AuthClient {}

    export interface JWTParams {
      client_email?: string
      private_key?: string
      scopes?: string | string[]
    }

    export function getClient(options?: any): AuthClient
    export class JWT {
      constructor(params?: JWTParams)
    }
    export class GoogleAuth {
      constructor(options?: any)
    }

    export namespace auth {
      export class OAuth2 {
        constructor(clientId?: string, clientSecret?: string, redirectUri?: string)
        getAccessToken(code?: string): Promise<{ tokens: any }>
        setCredentials(creds: any): void
        refreshAccessToken(): Promise<{ credentials: any }>
        getToken(code: string): Promise<any>
      }
    }

    export interface Oauth2Api {
      userinfo: {
        get(): Promise<{ data: { email?: string; id?: string; name?: string; picture?: string } }>
      }
    }

    export function oauth2(options: { version?: string; auth?: AuthClient }): Oauth2Api
    export namespace oauth2 {
      export { Oauth2Api }
    }

    export interface CalendarApi {
      events: {
        list(options?: any): Promise<{ items?: CalendarEvent[] }>
        insert(options: {
          calendarId?: string
          requestBody?: CalendarEvent
          sendUpdates?: string
        }): Promise<{ data: CalendarEvent }>
      }
      calendarList: {
        list(options?: any): Promise<{ data: { items: CalendarListEntry[] } }>
      }
    }

    export interface CalendarEvent {
      id?: string
      htmlLink?: string
      summary?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }

    export interface CalendarListEntry {
      id?: string
      summary?: string
    }

    export function calendar(options: { version?: string; auth?: AuthClient }): CalendarApi
    export namespace calendar {
      export { CalendarApi }
      export namespace v3 {
        export { CalendarApi }
        export { CalendarEvent }
        export { CalendarListEntry }
      }
    }
  }

  export { google }
  export default google
}
