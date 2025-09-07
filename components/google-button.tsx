"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { GOOGLE_CLIENT_ID, type GoogleUser } from "@/lib/google-auth"

interface GoogleButtonProps {
  onSuccess: (user: GoogleUser) => void
  onError: (error: Error) => void
  isLoading: boolean
}

export default function GoogleButton({ onSuccess, onError, isLoading }: GoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const googleButtonRendered = useRef(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    // Check if Google Client ID is configured
    if (!GOOGLE_CLIENT_ID) {
      console.error("Google Client ID not configured")
      setShowFallback(true)
      return
    }

    const renderGoogleButton = () => {
      if (!window.google || !buttonRef.current || googleButtonRendered.current) return

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (!response || !response.credential) {
              onError(new Error("Invalid Google response"))
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

              onSuccess(googleUser)
            } catch (error) {
              onError(error instanceof Error ? error : new Error("Failed to parse Google token"))
            }
          },
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: buttonRef.current.offsetWidth,
        })

        googleButtonRendered.current = true
      } catch (error) {
        console.error("Error rendering Google button:", error)
        setShowFallback(true)
      }
    }

    // Check if Google SDK is loaded
    if (window.google && window.google.accounts) {
      renderGoogleButton()
    } else {
      // Wait for Google SDK to load
      const checkGoogleInterval = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogleInterval)
          renderGoogleButton()
        }
      }, 100)

      // Show fallback after 5 seconds if Google doesn't load
      const fallbackTimeout = setTimeout(() => {
        setShowFallback(true)
      }, 5000)

      return () => {
        clearInterval(checkGoogleInterval)
        clearTimeout(fallbackTimeout)
      }
    }
  }, [onSuccess, onError])

  // Show configuration message if Google Client ID is not set
  if (!GOOGLE_CLIENT_ID || showFallback) {
    return (
      <div className="w-full">
        <Button
          disabled
          variant="outline"
          className="w-full border-orange-300 text-orange-700 bg-orange-50 cursor-not-allowed"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Google Sign-In Not Configured
        </Button>
        <p className="text-xs text-orange-600 mt-2 text-center">
          Google authentication requires proper setup. Please use email login.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <Button disabled variant="outline" className="w-full border-stone-300 text-stone-700 hover:bg-stone-50">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to Google...
        </Button>
      ) : (
        <div ref={buttonRef} className="w-full min-h-[40px] flex items-center justify-center">
          {/* This will be replaced by the Google button */}
        </div>
      )}
    </div>
  )
}
