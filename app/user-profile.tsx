"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Edit3, Download, Database, Camera, Loader2, Check, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { updateUser, getUserByEmail, getUserByName, uploadProfileImage } from "../lib/database"
import type { User } from "../lib/supabase"

interface UserProfileProps {
  currentUser: User
  onBack: () => void
  onLogout: () => void
}

export default function UserProfile({ currentUser, onBack, onLogout }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState({
    name: currentUser.name,
    email: currentUser.email,
    password: currentUser.password,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(currentUser.profile_url || null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = "Finance Tracker - Profile"
  }, [])

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError("")
      setSuccess("")

      // Check if email is already taken by another user
      if (editedUser.email !== currentUser.email) {
        const existingUser = await getUserByEmail(editedUser.email)
        if (existingUser && existingUser.id !== currentUser.id) {
          setError("Email is already in use by another account.")
          setIsLoading(false)
          return
        }
      }

      // Check if name is already taken by another user
      if (editedUser.name !== currentUser.name) {
        const existingUser = await getUserByName(editedUser.name)
        if (existingUser && existingUser.id !== currentUser.id) {
          setError("Username is already taken. Please choose another name.")
          setIsLoading(false)
          return
        }
      }

      // Update user in database
      await updateUser(currentUser.id, {
        name: editedUser.name,
        email: editedUser.email,
        password: editedUser.password,
      })

      setSuccess("Profile updated successfully!")
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditedUser({
      name: currentUser.name,
      email: currentUser.email,
      password: currentUser.password,
    })
    setIsEditing(false)
    setError("")
  }

  const handleProfileImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setError("")

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image is too large. Maximum size is 5MB.")
        return
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.")
        return
      }

      // Upload to Supabase storage
      const imageUrl = await uploadProfileImage(currentUser.id, file)

      // Update user record with new profile URL
      await updateUser(currentUser.id, { profile_url: imageUrl })

      // Update local state
      setProfileImage(imageUrl)
      setSuccess("Profile picture updated successfully!")
    } catch (error) {
      console.error("Error uploading profile image:", error)
      setError("Failed to upload profile image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const exportData = () => {
    // Export user's financial data
    console.log("Exporting financial data for user:", currentUser.id)
    // This would fetch all user data from Supabase and create a downloadable file
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            size="sm"
            className="border-stone-300 text-stone-700 hover:bg-stone-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tracker
          </Button>
          <h1 className="text-3xl font-light tracking-wide text-stone-800">User Profile</h1>
        </div>

        {/* Profile Card */}
        <Card className="bg-white/80 border-stone-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-amber-200">
                  {profileImage ? (
                    <AvatarImage src={profileImage || "/placeholder.svg"} alt={currentUser.name} />
                  ) : (
                    <AvatarFallback className="bg-amber-100 text-amber-600 text-2xl">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  onClick={handleProfileImageClick}
                  className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-600 text-white rounded-full p-2 shadow-md"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfileImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            <CardTitle className="text-2xl text-stone-800">{currentUser.name}</CardTitle>
            <p className="text-stone-600">{currentUser.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Synced with Supabase</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center justify-between">
                <span>{error}</span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => setError("")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600 flex items-center justify-between">
                <span className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  {success}
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-500" onClick={() => setSuccess("")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Profile Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-800">Profile Information</h3>
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="border-stone-300 text-stone-700"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <Separator className="bg-stone-200" />

              {/* Name Field */}
              <div className="space-y-2">
                <Label className="text-stone-700 flex items-center gap-2">Full Name</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.name}
                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                    className="border-stone-300 focus:border-amber-400"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-stone-800 font-medium p-2 bg-stone-50 rounded">{currentUser.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label className="text-stone-700 flex items-center gap-2">Email Address</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                    className="border-stone-300 focus:border-amber-400"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-stone-800 font-medium p-2 bg-stone-50 rounded">{currentUser.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label className="text-stone-700 flex items-center gap-2">Password</Label>
                {isEditing ? (
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editedUser.password}
                    onChange={(e) => setEditedUser({ ...editedUser, password: e.target.value })}
                    className="border-stone-300 focus:border-amber-400"
                    disabled={isLoading}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-stone-800 font-medium p-2 bg-stone-50 rounded flex-1">
                      {showPassword ? currentUser.password : "•".repeat(currentUser.password.length)}
                    </p>
                    <Button
                      onClick={() => setShowPassword(!showPassword)}
                      variant="outline"
                      size="sm"
                      className="border-stone-300 text-stone-600"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-stone-200" />

            {/* Account Statistics */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-stone-800">Account Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">✓</p>
                    <p className="text-sm text-stone-600">Cloud Synced</p>
                    <p className="text-xs text-green-600">Real-time</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">📱</p>
                    <p className="text-sm text-stone-600">Multi-Device</p>
                    <p className="text-xs text-blue-600">Active</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator className="bg-stone-200" />

            {/* Account Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-stone-800">Account Actions</h3>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={exportData}
                  variant="outline"
                  className="w-full justify-start border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Financial Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  {/* Placeholder for additional account actions */}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
