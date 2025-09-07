"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Users, Loader2, ArrowLeft, Shield } from "lucide-react"
import { getAllUsers, deleteUserAndData } from "../../lib/database"
import type { User } from "../../lib/supabase"

export default function AdminPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    document.title = "Finance Tracker - Admin Portal"

    // Check if admin is already logged in (session storage)
    const adminSession = sessionStorage.getItem("adminLoggedIn")
    if (adminSession === "true") {
      setIsAdminLoggedIn(true)
      loadAllUsers()
    } else {
      setIsLoginDialogOpen(true)
    }
  }, [])

  // Load all users for admin panel
  const loadAllUsers = async () => {
    try {
      setIsLoading(true)
      const users = await getAllUsers()
      setUsers(users)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminLogin = () => {
    if (adminPassword === "122004") {
      setIsAdminLoggedIn(true)
      setIsLoginDialogOpen(false)
      setAdminPassword("")
      setLoginError("")
      sessionStorage.setItem("adminLoggedIn", "true")
      loadAllUsers()
    } else {
      setLoginError("Invalid admin password.")
    }
  }

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    sessionStorage.removeItem("adminLoggedIn")
    setShowPasswords({})
  }

  const togglePasswordVisibility = (email: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [email]: !prev[email],
    }))
  }

  const deleteUser = async (userIdToDelete: string) => {
    try {
      const confirmDelete = window.confirm("Are you sure you want to delete this user? This action cannot be undone.")
      if (confirmDelete) {
        await deleteUserAndData(userIdToDelete)
        await loadAllUsers() // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  const clearAllUsers = async () => {
    try {
      const confirmDelete = window.confirm("Are you sure you want to delete ALL users? This cannot be undone.")
      if (confirmDelete) {
        const doubleConfirm = window.confirm(
          "This will permanently delete all user data. Type 'DELETE ALL' to confirm.",
        )
        if (doubleConfirm) {
          for (const user of users) {
            await deleteUserAndData(user.id)
          }
          await loadAllUsers()
        }
      }
    } catch (error) {
      console.error("Error clearing all users:", error)
    }
  }

  const goToMainApp = () => {
    window.location.href = "/"
  }

  // Admin Login Dialog
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-red-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-red-600" />
              <CardTitle className="text-2xl font-light tracking-wide text-red-800">Admin Portal</CardTitle>
            </div>
            <CardDescription className="text-red-600">
              Restricted Access - Admin Authentication Required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="admin-password" className="text-red-700">
                Admin Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="border-red-300 focus:border-red-400"
                placeholder="Enter admin password"
                onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              />
            </div>
            {loginError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600 text-center">
                {loginError}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAdminLogin} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                <Shield className="mr-2 h-4 w-4" />
                Access Admin Panel
              </Button>
            </div>
            <div className="text-center">
              <Button onClick={goToMainApp} variant="ghost" className="text-stone-500 hover:text-stone-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Finance Tracker
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-lg border-stone-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={goToMainApp}
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Button>

              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-amber-600" />
                <CardTitle className="text-2xl font-light tracking-wide text-stone-800">Admin Dashboard</CardTitle>
              </div>

              <Button
                onClick={handleAdminLogout}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Logout Admin
              </Button>
            </div>

            <CardDescription className="text-stone-600">
              User Management System - Total Users: {users.length}
            </CardDescription>

            <div className="flex gap-2 justify-center mt-4">
              <Button
                onClick={loadAllUsers}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Users"
                )}
              </Button>
              <Button
                onClick={clearAllUsers}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={users.length === 0}
              >
                Clear All Users
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
                <p className="text-stone-600">Loading user data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user, index) => (
                      <Card key={user.id} className="bg-white/80 border-stone-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-stone-800 flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            User #{index + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wide">Name</Label>
                            <p className="text-stone-700 font-medium">{user.name}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wide">Email</Label>
                            <p className="text-stone-700 font-mono text-sm break-all">{user.email}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wide">User ID</Label>
                            <p className="text-stone-700 font-mono text-xs break-all">{user.id}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wide">Created</Label>
                            <p className="text-stone-700 text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wide">Password</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-stone-700 font-mono text-sm flex-1">
                                {showPasswords[user.email]
                                  ? user.password
                                  : "•".repeat(Math.min(user.password.length, 12))}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => togglePasswordVisibility(user.email)}
                                className="h-6 w-6 p-0 text-stone-500 hover:text-stone-700"
                              >
                                {showPasswords[user.email] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteUser(user.id)}
                              className="w-full border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Delete User
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-600 mb-2">No Users Found</h3>
                    <p className="text-stone-500">No users have registered yet.</p>
                    <p className="text-stone-400 text-sm mt-2">
                      Users will appear here when they sign up for the Finance Tracker.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        <Card className="mt-6 bg-white/80 border-stone-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-stone-800 flex items-center gap-2">📊 Analytics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                <p className="text-sm text-blue-700">Total Users</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {users.filter((u) => u.email.includes("google")).length}
                </p>
                <p className="text-sm text-green-700">Google Users</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter((u) => !u.email.includes("google")).length}
                </p>
                <p className="text-sm text-purple-700">Email Users</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">
                  {users.filter((u) => new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                </p>
                <p className="text-sm text-amber-700">New This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
