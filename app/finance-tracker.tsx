"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Plus, X, RotateCcw, User, Loader2, RefreshCw } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { format, addMonths, startOfMonth, isSameDay } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import UserProfile from "./user-profile"
import {
  getUserSettings,
  updateUserSettings,
  getExpenseCategories,
  getMonthlyExpenses,
  upsertMonthlyExpense,
  getScheduledExpenses,
  createScheduledExpense,
  updateScheduledExpense,
  deleteScheduledExpense,
  createUserSettings,
  initializeDefaultCategories,
} from "../lib/database"
import type { ExpenseCategory, MonthlyExpense, ScheduledExpense, UserSettings } from "../lib/supabase"
import type { User as UserType } from "../lib/supabase"

interface FinanceTrackerProps {
  currentUser: UserType
  onLogout: () => void
}

export default function FinanceTracker({ currentUser, onLogout }: FinanceTrackerProps) {
  const [currentPage, setCurrentPage] = useState<"tracker" | "profile">("tracker")
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // State from database
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([])
  const [scheduledExpenses, setScheduledExpenses] = useState<ScheduledExpense[]>([])

  // UI state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [newExpense, setNewExpense] = useState({
    date: new Date(),
    category: "",
    amount: 0,
    description: "",
  })

  useEffect(() => {
    document.title = "Finance Tracker - Dashboard"
  }, [])

  // Load all data from database
  const loadUserData = async () => {
    try {
      setIsLoading(true)

      // Load user settings
      let settings = await getUserSettings(currentUser.id)

      // If no settings exist, create them with zero values
      if (!settings) {
        settings = await createUserSettings(currentUser.id, {
          monthly_salary: 0,
          rollover_amount: 0,
          current_month: new Date().getMonth() + 1,
          current_year: new Date().getFullYear(),
        })
      }

      setUserSettings(settings)
      setSelectedDate(new Date(settings.current_year, settings.current_month - 1, 1))
      setCalendarMonth(new Date(settings.current_year, settings.current_month - 1, 1))

      // Load expense categories
      let categories = await getExpenseCategories(currentUser.id)

      // If no categories exist, initialize them
      if (categories.length === 0) {
        categories = await initializeDefaultCategories(currentUser.id)
      }

      setExpenseCategories(categories)

      // Load monthly expenses for current month
      const currentMonth = settings.current_month
      const currentYear = settings.current_year
      const expenses = await getMonthlyExpenses(currentUser.id, currentMonth, currentYear)

      // If no expenses exist for this month, create zero entries for all categories
      if (expenses.length === 0) {
        const zeroExpensePromises = categories.map((cat) =>
          upsertMonthlyExpense(currentUser.id, cat.category, 0, currentMonth, currentYear),
        )
        const zeroExpenses = await Promise.all(zeroExpensePromises)
        setMonthlyExpenses(zeroExpenses)
      } else {
        setMonthlyExpenses(expenses)
      }

      // Load scheduled expenses
      const scheduled = await getScheduledExpenses(currentUser.id)
      setScheduledExpenses(scheduled)
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sync data to database
  const syncData = async () => {
    try {
      setIsSyncing(true)

      // Only reload if we're not currently loading
      if (!isLoading) {
        await loadUserData()
      }
    } catch (error) {
      console.error("Error syncing data:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadUserData()

    // Set up auto-sync every 30 seconds for multi-device support
    const syncInterval = setInterval(() => {
      if (!isSyncing) {
        syncData()
      }
    }, 30000)

    return () => clearInterval(syncInterval)
  }, [currentUser.id])

  // Get expense amount for a category
  const getExpenseAmount = (category: string) => {
    const expense = monthlyExpenses.find((exp) => exp.category === category)
    return expense?.amount || 0
  }

  // Update expense amount
  const updateExpenseAmount = async (category: string, amount: number) => {
    try {
      if (!userSettings) return

      await upsertMonthlyExpense(
        currentUser.id,
        category,
        amount,
        userSettings.current_month,
        userSettings.current_year,
      )

      // Update local state
      setMonthlyExpenses((prev) => {
        const existing = prev.find((exp) => exp.category === category)
        if (existing) {
          return prev.map((exp) => (exp.category === category ? { ...exp, amount } : exp))
        } else {
          return [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              user_id: currentUser.id,
              category,
              amount,
              month: userSettings.current_month,
              year: userSettings.current_year,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        }
      })
    } catch (error) {
      console.error("Error updating expense:", error)
    }
  }

  // Update salary
  const updateSalary = async (newSalary: number) => {
    try {
      if (!userSettings) return

      const updatedSettings = await updateUserSettings(currentUser.id, {
        monthly_salary: newSalary,
      })
      setUserSettings(updatedSettings)
    } catch (error) {
      console.error("Error updating salary:", error)
    }
  }

  // Calculate totals
  const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const salary = userSettings?.monthly_salary || 0
  const rollover = userSettings?.rollover_amount || 0
  const remaining = salary + rollover - totalExpenses

  // Get expenses for selected date
  const selectedDateExpenses = scheduledExpenses.filter((expense) =>
    isSameDay(new Date(expense.expense_date), selectedDate),
  )
  const selectedDateExpenseTotal = selectedDateExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Get expense dates for calendar
  const expenseDates = scheduledExpenses
    .filter((expense) => {
      const expenseDate = new Date(expense.expense_date)
      return (
        expenseDate.getMonth() === calendarMonth.getMonth() && expenseDate.getFullYear() === calendarMonth.getFullYear()
      )
    })
    .map((expense) => new Date(expense.expense_date))

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const moveToNextMonth = async () => {
    try {
      if (!userSettings) return

      const nextMonth = addMonths(selectedDate, 1)
      const firstOfNextMonth = startOfMonth(nextMonth)

      // Update user settings with new month/year and rollover
      const newMonth = firstOfNextMonth.getMonth() + 1
      const newYear = firstOfNextMonth.getFullYear()

      await updateUserSettings(currentUser.id, {
        current_month: newMonth,
        current_year: newYear,
        rollover_amount: remaining,
      })

      // Reset scheduled expenses "added_to_expenses" status
      const resetPromises = scheduledExpenses.map((expense) =>
        updateScheduledExpense(expense.id, { added_to_expenses: false }),
      )
      await Promise.all(resetPromises)

      // Clear monthly expenses for new month
      setMonthlyExpenses([])

      // Update UI state
      setSelectedDate(firstOfNextMonth)
      setCalendarMonth(firstOfNextMonth)

      // Reload data
      await loadUserData()
    } catch (error) {
      console.error("Error moving to next month:", error)
    }
  }

  const resetRollover = async () => {
    try {
      if (!userSettings) return

      await updateUserSettings(currentUser.id, {
        rollover_amount: 0,
      })

      setUserSettings((prev) => (prev ? { ...prev, rollover_amount: 0 } : null))
    } catch (error) {
      console.error("Error resetting rollover:", error)
    }
  }

  const addScheduledExpense = async () => {
    try {
      if (newExpense.category && newExpense.amount > 0) {
        await createScheduledExpense(currentUser.id, {
          category: newExpense.category,
          amount: newExpense.amount,
          expense_date: format(newExpense.date, "yyyy-MM-dd"),
          description: newExpense.description || null,
          added_to_expenses: false,
        })

        setNewExpense({ date: new Date(), category: "", amount: 0, description: "" })
        setIsAddingExpense(false)

        // Reload scheduled expenses
        const updated = await getScheduledExpenses(currentUser.id)
        setScheduledExpenses(updated)
      }
    } catch (error) {
      console.error("Error adding scheduled expense:", error)
    }
  }

  const removeScheduledExpense = async (id: string) => {
    try {
      await deleteScheduledExpense(id)
      setScheduledExpenses((prev) => prev.filter((expense) => expense.id !== id))
    } catch (error) {
      console.error("Error removing scheduled expense:", error)
    }
  }

  const addToExpenses = async (expenseId: string) => {
    try {
      const scheduledExpense = scheduledExpenses.find((exp) => exp.id === expenseId)
      if (!scheduledExpense || !userSettings) return

      // Add to monthly expenses
      const currentAmount = getExpenseAmount(scheduledExpense.category)
      await updateExpenseAmount(scheduledExpense.category, currentAmount + scheduledExpense.amount)

      // Mark as added to expenses
      await updateScheduledExpense(expenseId, { added_to_expenses: true })

      setScheduledExpenses((prev) =>
        prev.map((expense) => (expense.id === expenseId ? { ...expense, added_to_expenses: true } : expense)),
      )
    } catch (error) {
      console.error("Error adding to expenses:", error)
    }
  }

  // Create chart data
  const chartData = [
    { name: "Salary", value: salary, fill: "#22C55E" },
    ...expenseCategories.map((category) => ({
      name: category.category,
      value: getExpenseAmount(category.category),
      fill: category.color,
    })),
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <p className="text-stone-700">Loading your financial data...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (currentPage === "profile") {
    return <UserProfile currentUser={currentUser} onBack={() => setCurrentPage("tracker")} onLogout={onLogout} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Profile Panel */}
        <div className="text-center mb-6 relative">
          {/* Profile Panel - Top Left */}
          <div className="absolute top-0 left-0">
            <Card className="bg-white/90 border-stone-200 shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    {currentUser.profile_url ? (
                      <AvatarImage src={currentUser.profile_url || "/placeholder.svg"} alt={currentUser.name} />
                    ) : (
                      <AvatarFallback className="bg-amber-100 text-amber-600 font-semibold">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium text-stone-800">{currentUser.name}</p>
                    <p className="text-xs text-stone-600">{currentUser.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentPage("profile")}
                    className="h-8 w-8 p-0 text-stone-600 hover:text-stone-800"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <h1
            className="text-4xl font-light tracking-[0.2em] text-stone-800 mb-2"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontStretch: "expanded" }}
          >
            TRACK YOUR MONEY
          </h1>
          <p className="text-stone-600">Manage your finances with ease</p>

          {/* Sync and Logout Buttons */}
          <div className="absolute top-6 right-6 flex gap-2">
            <Button
              onClick={syncData}
              variant="outline"
              size="sm"
              className="border-stone-300 text-stone-700 hover:bg-stone-100 bg-transparent"
              disabled={isSyncing}
              title={isSyncing ? "Syncing..." : "Sync data across devices"}
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="border-stone-300 text-stone-700 hover:bg-stone-100 bg-transparent"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Salary Input */}
        <Card className="bg-white/80 border-stone-200 shadow-lg max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="salary" className="text-stone-700 whitespace-nowrap">
                💰 Monthly Salary:
              </Label>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => updateSalary(Number(e.target.value))}
                className="border-stone-300 focus:border-amber-400 font-semibold"
              />
            </div>
            {rollover > 0 && (
              <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700 text-center flex items-center justify-between">
                <span>+ ₹{rollover.toLocaleString()} carried over from previous month</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetRollover}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                  title="Reset rollover amount"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Expenses and Chart */}
          <div className="space-y-4">
            {/* Monthly Expenses */}
            <Card className="bg-white/80 border-stone-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-stone-800 flex items-center gap-2">
                  📊 Monthly Expenses
                  <span className="text-sm font-normal text-stone-600">({format(selectedDate, "MMMM yyyy")})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseCategories.map((category) => (
                    <div key={category.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                        <span className="text-stone-700 font-medium">{category.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-stone-600">₹</span>
                        <Input
                          type="number"
                          value={getExpenseAmount(category.category)}
                          onChange={(e) => updateExpenseAmount(category.category, Number(e.target.value))}
                          className="w-28 h-8 text-right border-stone-300 focus:border-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-stone-300 pt-4 mt-4">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span className="text-stone-700">Total Expenses:</span>
                      <span className="text-red-600">₹{totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-xl mt-2">
                      <span className="text-stone-700">Remaining:</span>
                      <span className={`${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ₹{remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Distribution Chart */}
            <Card className="bg-white/80 border-stone-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-stone-800 text-center">Expense Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ChartContainer
                  config={{
                    value: {
                      label: "Amount",
                    },
                  }}
                  className="h-[350px] w-[350px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                        labelLine={true}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar and Summary */}
          <div className="space-y-4">
            {/* Calendar Section */}
            <Card className="bg-white/80 border-stone-200 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-stone-800 flex items-center gap-2">📅 Financial Calendar</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    onMonthChange={setCalendarMonth}
                    month={calendarMonth}
                    className="rounded-md border border-stone-200"
                    modifiers={{
                      expense: expenseDates,
                    }}
                    modifiersStyles={{
                      expense: { border: "2px solid #d97706", borderRadius: "50%" },
                    }}
                  />
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-600"></div>
                    <span>Days with scheduled expenses</span>
                  </div>

                  {/* Scheduled Expenses for Selected Date */}
                  {selectedDateExpenses.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-medium text-amber-800 mb-2">Expenses on {format(selectedDate, "MMM d")}:</h4>
                      <div className="space-y-2">
                        {selectedDateExpenses.map((expense) => (
                          <div key={expense.id} className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <span className="font-medium text-amber-700">{expense.category}</span>
                              {expense.description && <p className="text-amber-600 text-xs">{expense.description}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-800">₹{expense.amount.toLocaleString()}</span>
                              {!expense.added_to_expenses ? (
                                <Button
                                  size="sm"
                                  onClick={() => addToExpenses(expense.id)}
                                  className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Add to Expenses
                                </Button>
                              ) : (
                                <span className="text-xs text-green-600 font-medium">Added ✓</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeScheduledExpense(expense.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-amber-300 pt-2 mt-2">
                          <div className="flex justify-between items-center font-bold text-sm">
                            <span className="text-amber-700">Total for this date:</span>
                            <span className="text-amber-800">₹{selectedDateExpenseTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Scheduled Expense */}
                  <Dialog open={isAddingExpense} onOpenChange={setIsAddingExpense}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 bg-transparent"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Scheduled Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Scheduled Expense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="expense-date">Date</Label>
                          <Input
                            id="expense-date"
                            type="date"
                            value={format(newExpense.date, "yyyy-MM-dd")}
                            onChange={(e) => setNewExpense({ ...newExpense, date: new Date(e.target.value) })}
                            className="border-stone-300 focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expense-category">Category</Label>
                          <Select
                            value={newExpense.category}
                            onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                          >
                            <SelectTrigger className="border-stone-300 focus:border-amber-400">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category.id} value={category.category}>
                                  {category.category}
                                </SelectItem>
                              ))}
                              <SelectItem value="Entertainment">🎬 Entertainment</SelectItem>
                              <SelectItem value="Healthcare">🏥 Healthcare</SelectItem>
                              <SelectItem value="Education">📚 Education</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expense-amount">Amount</Label>
                          <Input
                            id="expense-amount"
                            type="number"
                            value={newExpense.amount || ""}
                            onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                            className="border-stone-300 focus:border-amber-400"
                            placeholder="Enter amount"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expense-description">Description (Optional)</Label>
                          <Input
                            id="expense-description"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                            className="border-stone-300 focus:border-amber-400"
                            placeholder="Enter description"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={addScheduledExpense}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Add Expense
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddingExpense(false)} className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button onClick={moveToNextMonth} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Move on to Next Month
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-white/80 border-stone-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-stone-800">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h3 className="font-medium text-stone-800 mb-3">
                    Summary for {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Monthly Income:</span>
                      <span className="font-medium text-green-600">₹{salary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Monthly Expenses:</span>
                      <span className="font-medium text-red-600">₹{totalExpenses.toLocaleString()}</span>
                    </div>
                    {rollover > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Carried Over:</span>
                        <span className="font-medium text-green-600">₹{rollover.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedDateExpenseTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-600">Scheduled for {format(selectedDate, "MMM d")}:</span>
                        <span className="font-medium text-orange-600">
                          -₹{selectedDateExpenseTotal.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-stone-300 pt-2 mt-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-stone-700">Remaining Balance:</span>
                        <span className={`${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ₹{remaining.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
