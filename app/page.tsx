'use client'

/**
 * Traktion - Unified Personal Finance OS
 * Cross-platform finance management with autopays, subscriptions, and shared expenses
 */

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  FiHome, FiCreditCard, FiUsers, FiPlus, FiLink, FiBell, FiCheck, FiX, FiClock, FiArrowUp,
  FiArrowDown, FiRefreshCw, FiCalendar, FiDollarSign, FiPause, FiPlay, FiSettings,
  FiFilter, FiWatch, FiTablet, FiSmartphone, FiMonitor, FiAward, FiZap, FiTarget,
  FiMail, FiLayers, FiStar
} from 'react-icons/fi'

// Agent IDs from workflow.json
const AGENT_IDS = {
  FINANCIAL_INSIGHTS: '6985849049f279d47448a5b5',
  AUTOPAY_MONITOR: '6985842d2237a2c55706afd0',
  SUBSCRIPTION_TRACKER: '69858442e7c5cfd5352dad47',
  SHARED_EXPENSE: '6985846e1caa4e686dd66d66',
  PAYMENT_ACTION: '698584af1caa4e686dd66d76',
  SUBSCRIPTION_CONTROL: '698584c3094c8b2d4207dc8d',
  EXPENSE_SETTLEMENT: '698584d949f279d47448a5b8',
}

// TypeScript Interfaces
interface FinancialHealth {
  score: number
  trend: 'up' | 'down' | 'stable'
  factors: {
    payment_reliability: number
    subscription_efficiency: number
    expense_balance: number
  }
}

interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  paymentsOnTime: number
  totalPayments: number
  rank: number
  badge: 'gold' | 'silver' | 'bronze' | 'none'
}

interface AutopayItem {
  id: string
  name: string
  amount: number
  due_date: string
  status: 'pending' | 'scheduled' | 'approved' | 'delayed'
  category: string
  is_recurring: boolean
}

interface Subscription {
  id: string
  name: string
  amount: number
  billing_cycle: 'monthly' | 'yearly' | 'weekly'
  next_billing_date: string
  status: 'active' | 'paused' | 'cancelled'
  category: string
  auto_renew: boolean
  price_change?: number
}

interface SharedExpense {
  id: string
  description: string
  total_amount: number
  your_share: number
  group: string
  participants: string[]
  date: string
  settled: boolean
  paidBy: string
}

interface DashboardData {
  health: FinancialHealth | null
  autopays: AutopayItem[]
  subscriptions: Subscription[]
  expenses: {
    you_owe: number
    owed_to_you: number
    pending_count: number
    items: SharedExpense[]
  }
  leaderboard: LeaderboardEntry[]
}

// Navigation Component
function Navigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const navItems = [
    { id: 'home', icon: FiHome, label: 'Traktion Home' },
    { id: 'subscriptions', icon: FiCreditCard, label: 'Subscription Hub' },
    { id: 'party-paywall', icon: FiUsers, label: 'Party Paywall' },
    { id: 'about', icon: FiLayers, label: 'About' },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-screen md:w-64 bg-[#1a2744] border-r border-gray-700 flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiDollarSign className="text-[#4ade80]" />
            Traktion
          </h1>
          <p className="text-gray-400 text-sm mt-1">Personal Finance OS</p>
        </div>
        <div className="flex-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeTab === item.id
                  ? 'bg-[#4ade80] text-[#1a2744]'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <item.icon className="text-xl" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700">
          <Button variant="outline" className="w-full" size="sm">
            <FiSettings className="mr-2" />
            Settings
          </Button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a2744] border-t border-gray-700 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                activeTab === item.id ? 'text-[#4ade80]' : 'text-gray-400'
              }`}
            >
              <item.icon className="text-xl mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

// Financial Health Score Component
function FinancialHealthCard({ health, loading }: { health: FinancialHealth | null, loading: boolean }) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#4ade80] to-[#22c55e]">
        <CardContent className="p-6">
          <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-40 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (!health) return null

  const scoreColor = health.score >= 80 ? '#4ade80' : health.score >= 60 ? '#fbbf24' : '#ef4444'

  return (
    <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Financial Health Score
          {health.trend === 'up' && <FiArrowUp className="text-[#4ade80]" />}
          {health.trend === 'down' && <FiArrowDown className="text-red-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 mb-4">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#374151"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={scoreColor}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - health.score / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{health.score}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Payments</p>
            <p className="text-white font-semibold">{health.factors.payment_reliability}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Subscriptions</p>
            <p className="text-white font-semibold">{health.factors.subscription_efficiency}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Balance</p>
            <p className="text-white font-semibold">{health.factors.expense_balance}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Upcoming Payments Card
function UpcomingPaymentsCard({ autopays, loading, onAction }: {
  autopays: AutopayItem[],
  loading: boolean,
  onAction: (id: string, action: 'approve' | 'delay') => void
}) {
  if (loading) {
    return (
      <Card className="bg-[#1a2744] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Upcoming Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const upcomingPayments = autopays.slice(0, 5)

  return (
    <Card className="bg-[#1a2744] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Upcoming Payments
          <Badge variant="secondary">{autopays.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiCheck className="mx-auto text-4xl mb-2 text-[#4ade80]" />
            <p>All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{payment.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <FiCalendar className="text-gray-400 text-sm" />
                    <p className="text-gray-400 text-sm">{payment.due_date}</p>
                    <Badge variant={payment.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right mr-4">
                  <p className="text-white font-bold">${payment.amount.toFixed(2)}</p>
                  <p className="text-gray-400 text-xs">{payment.category}</p>
                </div>
                {payment.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => onAction(payment.id, 'approve')} className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
                      <FiCheck />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onAction(payment.id, 'delay')}>
                      <FiClock />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Payment Leaderboard Card
function PaymentLeaderboardCard({ leaderboard, loading }: {
  leaderboard: LeaderboardEntry[],
  loading: boolean
}) {
  if (loading) {
    return (
      <Card className="bg-[#1a2744] border-gray-700">
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold': return 'text-yellow-400'
      case 'silver': return 'text-gray-300'
      case 'bronze': return 'text-orange-400'
      default: return 'text-gray-500'
    }
  }

  return (
    <Card className="bg-[#1a2744] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Payment Leaderboard
          <FiAward className="text-[#4ade80]" />
        </CardTitle>
        <CardDescription className="text-gray-400">
          Ranks friends based on who pays first or most consistently
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`font-bold text-lg ${index < 3 ? getBadgeColor(entry.badge) : 'text-gray-500'}`}>
                  #{entry.rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-[#4ade80] flex items-center justify-center text-[#1a2744] font-bold">
                  {entry.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">{entry.name}</p>
                  <p className="text-gray-400 text-xs">
                    {entry.paymentsOnTime}/{entry.totalPayments} on time
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className={getBadgeColor(entry.badge)}>
                  <FiAward className="text-2xl" />
                </div>
                <div>
                  <p className="text-white font-bold">
                    {Math.round((entry.paymentsOnTime / entry.totalPayments) * 100)}%
                  </p>
                  <p className="text-gray-400 text-xs">Success</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
          <p className="text-blue-300 text-sm">Adds a playful competitive layer that encourages timely settlements</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Subscription Hub Screen
function SubscriptionHubScreen({ data, loading, onAction }: {
  data: DashboardData,
  loading: boolean,
  onAction: (id: string, action: string) => void
}) {
  const activeSubscriptions = data.subscriptions.filter(s => s.status === 'active')
  const monthlyBurn = activeSubscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Subscription Hub</h2>
        <div className="space-y-1 text-gray-400">
          <p>Helps you track every subscription in one clean dashboard.</p>
          <p>Shows renewal dates, price changes, and upcoming deductions.</p>
          <p>Lets you freeze, modify, or cancel plans instantly.</p>
          <p>Gives total clarity so no renewal ever catches you off guard.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Monthly Burn Rate</p>
            <p className="text-4xl font-bold text-white">${monthlyBurn.toFixed(0)}</p>
            <p className="text-gray-400 text-xs mt-1">per month</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Active Subscriptions</p>
            <p className="text-4xl font-bold text-[#4ade80]">{activeSubscriptions.length}</p>
            <p className="text-gray-400 text-xs mt-1">services</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-400 text-sm mb-2">Paused / Cancelled</p>
            <p className="text-4xl font-bold text-yellow-400">
              {data.subscriptions.filter(s => s.status !== 'active').length}
            </p>
            <p className="text-gray-400 text-xs mt-1">inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full" />)}
          </>
        ) : (
          <>
            {data.subscriptions.map(sub => (
              <Card key={sub.id} className="bg-[#1a2744] border-gray-700 hover:border-[#4ade80] transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{sub.name}</h3>
                      <p className="text-gray-400 text-sm">{sub.category}</p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-white">${sub.amount.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">per {sub.billing_cycle}</p>
                    {sub.price_change && (
                      <p className="text-red-400 text-xs mt-1">
                        Price increased by ${sub.price_change}
                      </p>
                    )}
                  </div>
                  <Separator className="my-3 bg-gray-700" />
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Next billing</span>
                      <span className="text-gray-300">{sub.next_billing_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Auto-renew</span>
                      <span className={sub.auto_renew ? 'text-green-400' : 'text-red-400'}>
                        {sub.auto_renew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onAction(sub.id, sub.status === 'active' ? 'freeze' : 'resume')}
                    >
                      {sub.status === 'active' ? <><FiPause className="mr-1" /> Freeze</> : <><FiPlay className="mr-1" /> Resume</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-800 text-red-400 hover:bg-red-900/20"
                      onClick={() => onAction(sub.id, 'cancel')}
                    >
                      <FiX className="mr-1" /> Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// Party Paywall Screen
function PartyPaywallScreen({ data, loading, onSettle }: {
  data: DashboardData,
  loading: boolean,
  onSettle: (id: string) => void
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)

  const groups = Array.from(new Set(data.expenses.items.map(e => e.group)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Party Paywall</h2>
          <div className="space-y-1 text-gray-400">
            <p>A shared spending wall for groups, events, and trips.</p>
            <p>Everyone sees who paid, who owes, and what's pending—no confusion.</p>
            <p>Auto-calculates splits and sends reminders to settle dues.</p>
            <p>Keeps group money transparent, fair, and drama-free.</p>
          </div>
        </div>
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
              <FiPlus className="mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a2744] text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Add Shared Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <Input placeholder="Dinner at restaurant" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input type="number" placeholder="0.00" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label>Group</Label>
                <Input placeholder="Roommates" className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <Label>Split Method</Label>
                <select className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-white">
                  <option>Equal Split</option>
                  <option>Custom Amounts</option>
                  <option>Percentage</option>
                </select>
              </div>
              <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-800">
          <CardContent className="p-6">
            <p className="text-gray-300 text-sm mb-2">You Owe</p>
            <p className="text-4xl font-bold text-red-400">${data.expenses.you_owe.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-800">
          <CardContent className="p-6">
            <p className="text-gray-300 text-sm mb-2">Owed to You</p>
            <p className="text-4xl font-bold text-[#4ade80]">${data.expenses.owed_to_you.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2744] border-gray-700">
          <CardContent className="p-6">
            <p className="text-gray-300 text-sm mb-2">Net Balance</p>
            <p className={`text-4xl font-bold ${
              data.expenses.owed_to_you - data.expenses.you_owe >= 0
                ? 'text-[#4ade80]'
                : 'text-red-400'
            }`}>
              ${Math.abs(data.expenses.owed_to_you - data.expenses.you_owe).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Group Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={selectedGroup === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedGroup('all')}
          className={selectedGroup === 'all' ? 'bg-[#4ade80] text-[#1a2744]' : ''}
        >
          All Groups
        </Button>
        {groups.map(group => (
          <Button
            key={group}
            size="sm"
            variant={selectedGroup === group ? 'default' : 'outline'}
            onClick={() => setSelectedGroup(group)}
            className={selectedGroup === group ? 'bg-[#4ade80] text-[#1a2744]' : ''}
          >
            {group}
          </Button>
        ))}
      </div>

      {/* Expense Feed */}
      <div className="space-y-3">
        {loading ? (
          <>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </>
        ) : (
          <>
            {data.expenses.items
              .filter(e => selectedGroup === 'all' || e.group === selectedGroup)
              .map(expense => (
                <Card key={expense.id} className="bg-[#1a2744] border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">{expense.description}</h3>
                          {expense.settled && (
                            <Badge className="bg-green-900 text-green-300">Settled</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary">{expense.group}</Badge>
                          <p className="text-gray-400 text-sm">Paid by {expense.paidBy}</p>
                          <p className="text-gray-400 text-sm">{expense.date}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-gray-400 text-sm">
                            {expense.participants.length} participants: {expense.participants.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-gray-400 text-sm">Total</p>
                        <p className="text-xl font-bold text-white">${expense.total_amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-400">Your share: ${expense.your_share.toFixed(2)}</p>
                      </div>
                      {!expense.settled && (
                        <Button
                          size="sm"
                          onClick={() => onSettle(expense.id)}
                          className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]"
                        >
                          <FiDollarSign className="mr-1" />
                          Settle
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>
    </div>
  )
}

// About / Marketing Screen
function AboutScreen() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Traktion - Unified Personal Finance OS
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Design a unified personal finance app that brings autopays, subscriptions, and shared expense splitting into one seamless ecosystem. Work consistently across smartwatch, phone, tablet, and laptop with real-time clarity, proactive reminders, and effortless financial control.
        </p>
      </div>

      {/* What Makes Traktion Unique */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">What Makes Traktion Unique</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
            <CardContent className="p-6">
              <FiLayers className="text-[#4ade80] text-3xl mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">All-in-One Finance Hub</h3>
              <p className="text-gray-300">Autopays, subscriptions, and splits—finally under one roof.</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
            <CardContent className="p-6">
              <FiRefreshCw className="text-[#4ade80] text-3xl mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">True Multi-Device Sync</h3>
              <p className="text-gray-300">Start on watch, continue on phone, finish on laptop—zero friction.</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
            <CardContent className="p-6">
              <FiZap className="text-[#4ade80] text-3xl mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">Snapshot Clarity</h3>
              <p className="text-gray-300">One glance gives you every important update with no cognitive load.</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
            <CardContent className="p-6">
              <FiTarget className="text-[#4ade80] text-3xl mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">Smart, Playful Money Management</h3>
              <p className="text-gray-300">From freeze controls to leaderboards—finance becomes effortless and engaging.</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
            <CardContent className="p-6">
              <FiBell className="text-[#4ade80] text-3xl mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">Proactive Financial Alerts</h3>
              <p className="text-gray-300">Traktion notifies you before problems happen—missed payments, renewals, or unusual spending.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cross-Device Experience */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Cross-Device Experience</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1a2744] border-gray-700">
            <CardContent className="p-6 text-center">
              <FiWatch className="text-[#4ade80] text-4xl mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">mRT Watch</h3>
              <p className="text-gray-400 text-sm">
                The mRT Watch gives you instant alerts for upcoming payments and dues.
                It sends quick vibrations so nothing slips your mind.
                Every reminder syncs instantly with your phone and other devices.
                You stay focused with glanceable updates right on your wrist.
                It keeps you consistently aware, prepared, and financially in control.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2744] border-gray-700">
            <CardContent className="p-6 text-center">
              <FiSmartphone className="text-[#4ade80] text-4xl mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Phone App</h3>
              <p className="text-gray-400 text-sm">
                The Traktion phone app is your central control hub for all finances.
                It gives you a clear dashboard for autopays, subscriptions, and splits.
                You can deep-dive into timelines, manage renewals, and settle payments instantly.
                Smart notifications keep you updated without overwhelming you.
                Everything is organized, intuitive, and built for fast, confident decision-making.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2744] border-gray-700">
            <CardContent className="p-6 text-center">
              <FiTablet className="text-[#4ade80] text-4xl mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">iPad</h3>
              <p className="text-gray-400 text-sm">
                The Traktion iPad app gives you a wider, more analytical view of your finances.
                Split-screen layouts let you compare data, track spending, and review details side-by-side.
                It's built for focused decision-making with richer visuals and deeper insights.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2744] border-gray-700">
            <CardContent className="p-6 text-center">
              <FiMonitor className="text-[#4ade80] text-4xl mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Desktop</h3>
              <p className="text-gray-400 text-sm">
                Full dashboard with advanced analytics, detailed reports, and comprehensive financial management tools for power users.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Problem Statement */}
      <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-800">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Problem Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 leading-relaxed">
            Managing personal finances today is fragmented and mentally exhausting. Users rely on multiple apps for UPI payments, bank transactions, subscriptions, and shared expenses, with no single platform offering unified visibility or control. Autopay deductions and subscription renewals often happen silently, leading to missed payments, overdrafts, or unnecessary charges. Shared expenses create confusion around settlements and accountability. Additionally, financial experiences fail to stay consistent across devices, breaking continuity and increasing cognitive load. There is a need for one reliable, cross-device system that provides real-time clarity, proactive reminders, and effortless financial control.
          </p>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-br from-[#4ade80] to-[#22c55e] border-[#4ade80]">
        <CardContent className="p-8 text-center">
          <h2 className="text-3xl font-bold text-[#1a2744] mb-4">
            Start Using the Traktion App Today
          </h2>
          <p className="text-[#1a2744] mb-2">
            Start using the Traktion app today and bring all your finances into one place.
          </p>
          <p className="text-[#1a2744] mb-2">
            Track autopays, manage subscriptions, and settle splits effortlessly.
          </p>
          <p className="text-[#1a2744] mb-2">
            Get real-time reminders so you never miss a payment again.
          </p>
          <p className="text-[#1a2744] mb-2">
            Enjoy a clean, unified experience across watch, phone, tablet, and laptop.
          </p>
          <p className="text-[#1a2744] mb-6 font-semibold">
            Take control of your money—download Traktion and start your journey now.
          </p>
          <Button size="lg" className="bg-[#1a2744] text-white hover:bg-[#0f1729]">
            Download Traktion
          </Button>
        </CardContent>
      </Card>

      {/* Get in Touch */}
      <Card className="bg-[#1a2744] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-2">
            <FiMail className="text-[#4ade80]" />
            Get in Touch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-2">
            Get in touch with Aadi and Krishiv for any questions or feedback.
          </p>
          <p className="text-gray-300 mb-2">
            We're happy to walk you through the Traktion experience.
          </p>
          <p className="text-gray-300 mb-2">
            Reach out for demos, clarifications, or collaboration.
          </p>
          <p className="text-gray-300 mb-4">
            Let's build smarter finance together.
          </p>
          <div className="flex gap-4">
            <Button variant="outline">Contact Us</Button>
            <Button variant="outline">Schedule Demo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Traktion Home Screen
function TraktionHomeScreen({ data, loading, onPaymentAction, onSettle }: {
  data: DashboardData,
  loading: boolean,
  onPaymentAction: (id: string, action: 'approve' | 'delay') => void,
  onSettle: () => void
}) {
  const activeSubscriptions = data.subscriptions.filter(s => s.status === 'active')
  const monthlyBurn = activeSubscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Traktion Home Menu</h2>
        <div className="space-y-1 text-gray-400">
          <p>Your main control center for everything in the app.</p>
          <p>Shows autopay timelines, upcoming payments, and key financial stats.</p>
          <p>Designed as your "one-glance command hub" for daily finance.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-1">Upcoming Payments</p>
            <p className="text-3xl font-bold text-white">{data.autopays.filter(a => a.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-1">Monthly Subscriptions</p>
            <p className="text-3xl font-bold text-[#4ade80]">${monthlyBurn.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-1">You Owe</p>
            <p className="text-3xl font-bold text-red-400">${data.expenses.you_owe.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm mb-1">Owed to You</p>
            <p className="text-3xl font-bold text-[#4ade80]">${data.expenses.owed_to_you.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FinancialHealthCard health={data.health} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <UpcomingPaymentsCard
            autopays={data.autopays}
            loading={loading}
            onAction={onPaymentAction}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PaymentLeaderboardCard leaderboard={data.leaderboard} loading={loading} />
        <Card className="bg-[#1a2744] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Pending Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">You Owe</p>
                <p className="text-2xl font-bold text-red-400">${data.expenses.you_owe.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Owed to You</p>
                <p className="text-2xl font-bold text-[#4ade80]">${data.expenses.owed_to_you.toFixed(2)}</p>
              </div>
            </div>
            {data.expenses.pending_count > 0 && (
              <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]" onClick={onSettle}>
                <FiDollarSign className="mr-2" />
                Settle Up ({data.expenses.pending_count} pending)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-[#1a2744] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Button className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744] h-12">
              <FiPlus className="mr-2" />
              Add Expense
            </Button>
            <Button variant="outline" className="h-12">
              <FiLink className="mr-2" />
              Link Account
            </Button>
            <Button variant="outline" className="h-12">
              <FiBell className="mr-2" />
              Set Reminder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Main App Component
export default function Home() {
  const [activeTab, setActiveTab] = useState('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>({
    health: null,
    autopays: [],
    subscriptions: [],
    expenses: {
      you_owe: 0,
      owed_to_you: 0,
      pending_count: 0,
      items: []
    },
    leaderboard: []
  })

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // For now, use mock data to avoid rate limiting
      // In production, you can enable the agent call with proper rate limiting
      // const insightsResult = await callAIAgent(
      //   'Get my financial overview including health score, upcoming payments, subscriptions, and shared expenses',
      //   AGENT_IDS.FINANCIAL_INSIGHTS
      // )

      // if (insightsResult.success) {
        // Mock data structure - simulating agent response
        setData({
          health: {
            score: 78,
            trend: 'up',
            factors: {
              payment_reliability: 85,
              subscription_efficiency: 72,
              expense_balance: 75
            }
          },
          autopays: [
            {
              id: '1',
              name: 'Netflix Premium',
              amount: 19.99,
              due_date: 'Feb 15, 2026',
              status: 'pending',
              category: 'Entertainment',
              is_recurring: true
            },
            {
              id: '2',
              name: 'Electric Bill',
              amount: 125.50,
              due_date: 'Feb 18, 2026',
              status: 'pending',
              category: 'Utilities',
              is_recurring: true
            },
            {
              id: '3',
              name: 'Internet Service',
              amount: 79.99,
              due_date: 'Feb 20, 2026',
              status: 'approved',
              category: 'Utilities',
              is_recurring: true
            },
            {
              id: '4',
              name: 'Credit Card Payment',
              amount: 450.00,
              due_date: 'Feb 22, 2026',
              status: 'pending',
              category: 'Credit',
              is_recurring: true
            },
            {
              id: '5',
              name: 'Gym Membership',
              amount: 45.00,
              due_date: 'Feb 25, 2026',
              status: 'approved',
              category: 'Health',
              is_recurring: true
            }
          ],
          subscriptions: [
            {
              id: 's1',
              name: 'Spotify Premium',
              amount: 10.99,
              billing_cycle: 'monthly',
              next_billing_date: 'Feb 12, 2026',
              status: 'active',
              category: 'Music',
              auto_renew: true
            },
            {
              id: 's2',
              name: 'Amazon Prime',
              amount: 14.99,
              billing_cycle: 'monthly',
              next_billing_date: 'Feb 18, 2026',
              status: 'active',
              category: 'Shopping',
              auto_renew: true
            },
            {
              id: 's3',
              name: 'Adobe Creative Cloud',
              amount: 54.99,
              billing_cycle: 'monthly',
              next_billing_date: 'Feb 20, 2026',
              status: 'active',
              category: 'Software',
              auto_renew: true,
              price_change: 5.00
            },
            {
              id: 's4',
              name: 'LinkedIn Premium',
              amount: 29.99,
              billing_cycle: 'monthly',
              next_billing_date: 'Feb 28, 2026',
              status: 'paused',
              category: 'Professional',
              auto_renew: false
            },
            {
              id: 's5',
              name: 'Disney+',
              amount: 7.99,
              billing_cycle: 'monthly',
              next_billing_date: 'Mar 5, 2026',
              status: 'active',
              category: 'Entertainment',
              auto_renew: true
            },
            {
              id: 's6',
              name: 'GitHub Pro',
              amount: 4.00,
              billing_cycle: 'monthly',
              next_billing_date: 'Feb 10, 2026',
              status: 'active',
              category: 'Developer Tools',
              auto_renew: true
            }
          ],
          expenses: {
            you_owe: 145.50,
            owed_to_you: 220.00,
            pending_count: 4,
            items: [
              {
                id: 'e1',
                description: 'Dinner at The Olive Garden',
                total_amount: 156.80,
                your_share: 52.27,
                group: 'Friends',
                participants: ['You', 'Alex', 'Sam'],
                date: 'Feb 4, 2026',
                settled: false,
                paidBy: 'Alex'
              },
              {
                id: 'e2',
                description: 'Grocery Shopping',
                total_amount: 186.40,
                your_share: 93.20,
                group: 'Roommates',
                participants: ['You', 'Jordan'],
                date: 'Feb 3, 2026',
                settled: false,
                paidBy: 'Jordan'
              },
              {
                id: 'e3',
                description: 'Uber to Airport',
                total_amount: 45.00,
                your_share: 22.50,
                group: 'Travel',
                participants: ['You', 'Chris'],
                date: 'Feb 1, 2026',
                settled: true,
                paidBy: 'You'
              },
              {
                id: 'e4',
                description: 'Concert Tickets',
                total_amount: 240.00,
                your_share: 60.00,
                group: 'Friends',
                participants: ['You', 'Alex', 'Sam', 'Taylor'],
                date: 'Jan 28, 2026',
                settled: false,
                paidBy: 'Sam'
              },
              {
                id: 'e5',
                description: 'Weekend Trip Expenses',
                total_amount: 450.00,
                your_share: 150.00,
                group: 'Travel',
                participants: ['You', 'Chris', 'Morgan'],
                date: 'Jan 25, 2026',
                settled: false,
                paidBy: 'You'
              }
            ]
          },
          leaderboard: [
            {
              id: 'l1',
              name: 'Alex Chen',
              avatar: 'AC',
              paymentsOnTime: 48,
              totalPayments: 50,
              rank: 1,
              badge: 'gold'
            },
            {
              id: 'l2',
              name: 'You',
              avatar: 'YO',
              paymentsOnTime: 42,
              totalPayments: 45,
              rank: 2,
              badge: 'silver'
            },
            {
              id: 'l3',
              name: 'Sam Taylor',
              avatar: 'ST',
              paymentsOnTime: 38,
              totalPayments: 42,
              rank: 3,
              badge: 'bronze'
            },
            {
              id: 'l4',
              name: 'Jordan Lee',
              avatar: 'JL',
              paymentsOnTime: 30,
              totalPayments: 35,
              rank: 4,
              badge: 'none'
            },
            {
              id: 'l5',
              name: 'Chris Morgan',
              avatar: 'CM',
              paymentsOnTime: 25,
              totalPayments: 32,
              rank: 5,
              badge: 'none'
            }
          ]
        })
      // } else {
      //   setError(insightsResult.error || 'Failed to load dashboard data')
      // }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'delay') => {
    try {
      const result = await callAIAgent(
        `${action} payment with ID ${paymentId}`,
        AGENT_IDS.PAYMENT_ACTION
      )

      if (result.success) {
        // Update local state
        setData(prev => ({
          ...prev,
          autopays: prev.autopays.map(ap =>
            ap.id === paymentId
              ? { ...ap, status: action === 'approve' ? 'approved' : 'delayed' }
              : ap
          )
        }))
      } else {
        // Show error to user
        setError(result.error || 'Failed to update payment')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string) => {
    try {
      const result = await callAIAgent(
        `${action} subscription with ID ${subscriptionId}`,
        AGENT_IDS.SUBSCRIPTION_CONTROL
      )

      if (result.success) {
        // Update local state
        setData(prev => ({
          ...prev,
          subscriptions: prev.subscriptions.map(sub =>
            sub.id === subscriptionId
              ? { ...sub, status: action === 'freeze' ? 'paused' : action === 'resume' ? 'active' : sub.status }
              : sub
          )
        }))
      } else {
        setError(result.error || 'Failed to update subscription')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  const handleExpenseSettlement = async (expenseId: string) => {
    try {
      const result = await callAIAgent(
        `Settle expense with ID ${expenseId}`,
        AGENT_IDS.EXPENSE_SETTLEMENT
      )

      if (result.success) {
        setData(prev => ({
          ...prev,
          expenses: {
            ...prev.expenses,
            items: prev.expenses.items.map(e =>
              e.id === expenseId ? { ...e, settled: true } : e
            )
          }
        }))
      } else {
        setError(result.error || 'Failed to settle expense')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f1729] to-gray-900">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-800">
              <AlertDescription className="text-red-400 flex items-center justify-between">
                {error}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadDashboardData}
                >
                  <FiRefreshCw className="mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Traktion Home */}
          {activeTab === 'home' && (
            <TraktionHomeScreen
              data={data}
              loading={loading}
              onPaymentAction={handlePaymentAction}
              onSettle={() => setActiveTab('party-paywall')}
            />
          )}

          {/* Subscription Hub */}
          {activeTab === 'subscriptions' && (
            <SubscriptionHubScreen
              data={data}
              loading={loading}
              onAction={handleSubscriptionAction}
            />
          )}

          {/* Party Paywall */}
          {activeTab === 'party-paywall' && (
            <PartyPaywallScreen
              data={data}
              loading={loading}
              onSettle={handleExpenseSettlement}
            />
          )}

          {/* About */}
          {activeTab === 'about' && <AboutScreen />}
        </div>
      </main>
    </div>
  )
}
