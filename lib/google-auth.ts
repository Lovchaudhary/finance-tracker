// Google OAuth configuration
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  given_name: string
  family_name: string
}

export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if client ID is available
    if (!GOOGLE_CLIENT_ID) {
      console.error("Google Client ID not found. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.")
      reject(new Error("Google Client ID not configured"))
      return
    }

    if (typeof window !== "undefined" && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: () => {}, // Will be set per component
        })
        resolve()
      } catch (error) {
        console.error("Failed to initialize Google Auth:", error)
        reject(error)
      }
    } else {
      // Wait for Google script to load
      const checkGoogle = () => {
        if (window.google) {
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: () => {},
            })
            resolve()
          } catch (error) {
            console.error("Failed to initialize Google Auth:", error)
            reject(error)
          }
        } else {
          setTimeout(checkGoogle, 100)
        }
      }
      checkGoogle()
    }
  })
}

// Update the signInWithGoogle function to handle errors better and provide more debugging
export const signInWithGoogle = (): Promise<GoogleUser> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      console.error("Google Sign-In SDK not loaded")
      reject(new Error("Google Sign-In not loaded"))
      return
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (!response || !response.credential) {
            console.error("Invalid Google response", response)
            reject(new Error("Invalid Google authentication response"))
            return
          }

          try {
            // Decode JWT token
            const base64Url = response.credential.split(".")[1]
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
            const payload = JSON.parse(window.atob(base64))

            const googleUser: GoogleUser = {
              id: payload.sub,
              email: payload.email,
              name: payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim(),
              picture: payload.picture || "",
              given_name: payload.given_name || "",
              family_name: payload.family_name || "",
            }

            console.log("Google authentication successful", { email: googleUser.email })
            resolve(googleUser)
          } catch (error) {
            console.error("Error parsing Google token:", error)
            reject(error)
          }
        },
        auto_select: false,
      })

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn("Google sign-in prompt not displayed", notification)
          // Fall back to the Google sign-in button
          window.google.accounts.id.renderButton(
            document.createElement("div"), // Create a temporary element
            { theme: "outline", size: "large" },
          )
        }
      })
    } catch (error) {
      console.error("Error during Google sign-in:", error)
      reject(error)
    }
  })
}

export const renderGoogleButton = (elementId: string, callback: (user: GoogleUser) => void) => {
  if (!window.google) return

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: any) => {
      try {
        const payload = JSON.parse(atob(response.credential.split(".")[1]))
        const googleUser: GoogleUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          given_name: payload.given_name,
          family_name: payload.family_name,
        }
        callback(googleUser)
      } catch (error) {
        console.error("Google auth error:", error)
      }
    },
  })

  window.google.accounts.id.renderButton(document.getElementById(elementId), {
    theme: "outline",
    size: "large",
    width: "100%",
    text: "continue_with",
  })
}

// Add type declarations for Google
declare global {
  interface Window {
    google: any
  }
}
