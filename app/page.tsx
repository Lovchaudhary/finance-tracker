"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import FinanceTracker from "./finance-tracker"
import { createUser, getUserByEmail, authenticateUser, initializeUserWithDefaults } from "../lib/database"
import type { User } from "../lib/supabase"

export default function LoginPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("signin")
  const [loginError, setLoginError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    document.title = "Finance Tracker - Login"
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      const user = await authenticateUser(email, password)

      if (user) {
        setCurrentUser(user)
        setIsLoggedIn(true)
        setSuccessMessage("")
      } else {
        setLoginError("Invalid email or password. Please try again.")
      }
    } catch (error) {
      console.error("Sign in error:", error)
      setLoginError("An error occurred during sign in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const name = formData.get("name") as string
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      // Check if user already exists
      const existingUser = await getUserByEmail(email)

      if (existingUser) {
        setLoginError("Account already exists with this email. Please sign in instead.")
        setSuccessMessage("")
      } else {
        // Create new user
        const newUser = await createUser(email, password, name)

        // Initialize user with proper defaults (all zeros)
        await initializeUserWithDefaults(newUser.id)

        setSuccessMessage("Sign up successful! You can now sign in.")
        setLoginError("")
        setActiveTab("signin")
      }
    } catch (error) {
      console.error("Sign up error:", error)
      setLoginError("An error occurred during sign up. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
  }

  if (isLoggedIn && currentUser) {
    return <FinanceTracker currentUser={currentUser} onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-stone-200">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-light tracking-wide text-stone-800">Welcome</CardTitle>
          <CardDescription className="text-stone-600">Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-stone-100">
              <TabsTrigger value="signin" className="text-stone-700">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-stone-700">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-stone-700">
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    className="border-stone-300 focus:border-amber-400"
                    required
                    name="email"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-stone-700">
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    className="border-stone-300 focus:border-amber-400"
                    required
                    name="password"
                    disabled={isLoading}
                  />
                </div>
                {loginError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">
                    {loginError}
                  </div>
                )}
                {successMessage && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-600 text-center">
                    {successMessage}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-stone-700">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    className="border-stone-300 focus:border-amber-400"
                    required
                    name="name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-stone-700">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    className="border-stone-300 focus:border-amber-400"
                    required
                    name="email"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-stone-700">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    className="border-stone-300 focus:border-amber-400"
                    required
                    name="password"
                    disabled={isLoading}
                  />
                </div>
                {loginError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">
                    {loginError}
                  </div>
                )}
                {successMessage && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-600 text-center">
                    {successMessage}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
