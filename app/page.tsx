'use client'

/**
 * Traktion - Personal Finance Management App
 * Main Dashboard Screen
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  FiHome, FiCreditCard, FiUsers, FiTrendingUp, FiPlus,
  FiLink, FiBell, FiCheck, FiX, FiClock, FiArrowUp,
  FiArrowDown, FiRefreshCw, FiCalendar, FiDollarSign,
  FiPause, FiPlay, FiSettings, FiFilter, FiSearch,
  FiPieChart, FiBarChart2
} from 'react-icons/fi'

// Agent IDs from workflow.json
const AGENT_IDS = {
  FINANCIAL_INSIGHTS: '6985849049f279d47448a5b5',
  AUTOPAY_MONITOR: '6985842d2237a2c55706afd0',
  SUBSCRIPTION_TRACKER: '69858442e7c5cfd5352dad47',
  INVESTMENT_PORTFOLIO: '69858456b90162af337b1e1b',
  SHARED_EXPENSE: '6985846e1caa4e686dd66d66',
  PAYMENT_ACTION: '698584af1caa4e686dd66d76',
  SUBSCRIPTION_CONTROL: '698584c3094c8b2d4207dc8d',
  EXPENSE_SETTLEMENT: '698584d949f279d47448a5b8',
}

// TypeScript Interfaces based on agent purposes
interface FinancialHealth {
  score: number
  trend: 'up' | 'down' | 'stable'
  factors: {
    payment_reliability: number
    subscription_efficiency: number
    investment_performance: number
    expense_balance: number
  }
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
}

interface Investment {
  symbol: string
  name: string
  value: number
  shares: number
  purchase_price: number
  current_price: number
  change_percent: number
  change_amount: number
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
}

interface DashboardData {
  health: FinancialHealth | null
  autopays: AutopayItem[]
  subscriptions: Subscription[]
  investments: {
    total_value: number
    daily_change: number
    daily_change_percent: number
    holdings: Investment[]
  }
  expenses: {
    you_owe: number
    owed_to_you: number
    pending_count: number
    items: SharedExpense[]
  }
}

// Navigation Component
function Navigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const navItems = [
    { id: 'dashboard', icon: FiHome, label: 'Dashboard' },
    { id: 'autopays', icon: FiCreditCard, label: 'Payments' },
    { id: 'expenses', icon: FiUsers, label: 'Expenses' },
    { id: 'investments', icon: FiTrendingUp, label: 'Investments' },
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
          <p className="text-gray-400 text-sm mt-1">Personal Finance</p>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Payments</p>
            <p className="text-white font-semibold">{health.factors.payment_reliability}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Subscriptions</p>
            <p className="text-white font-semibold">{health.factors.subscription_efficiency}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Investments</p>
            <p className="text-white font-semibold">{health.factors.investment_performance}%</p>
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

// Subscription Summary Card
function SubscriptionSummaryCard({ subscriptions, loading, onManage }: {
  subscriptions: Subscription[],
  loading: boolean,
  onManage: () => void
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

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
  const monthlyBurn = activeSubscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <Card className="bg-[#1a2744] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Subscriptions
          <Button size="sm" variant="outline" onClick={onManage}>
            Manage
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Monthly Burn</p>
            <p className="text-3xl font-bold text-white">${monthlyBurn.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Active Subscriptions</p>
            <p className="text-3xl font-bold text-[#4ade80]">{activeSubscriptions.length}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {activeSubscriptions.slice(0, 6).map(sub => (
            <Badge key={sub.id} variant="secondary" className="text-xs">
              {sub.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Investment Snapshot Card
function InvestmentSnapshotCard({ investments, loading }: {
  investments: DashboardData['investments'],
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

  const isPositive = investments.daily_change >= 0

  return (
    <Card className="bg-[#1a2744] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Portfolio Value
          <FiTrendingUp className="text-[#4ade80]" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-4xl font-bold text-white">${investments.total_value.toLocaleString()}</p>
          <div className={`flex items-center gap-2 mt-2 ${isPositive ? 'text-[#4ade80]' : 'text-red-400'}`}>
            {isPositive ? <FiArrowUp /> : <FiArrowDown />}
            <span className="font-semibold">
              ${Math.abs(investments.daily_change).toFixed(2)} ({investments.daily_change_percent.toFixed(2)}%)
            </span>
            <span className="text-gray-400 text-sm">today</span>
          </div>
        </div>
        <div className="space-y-2">
          {investments.holdings.slice(0, 3).map(holding => (
            <div key={holding.symbol} className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{holding.symbol}</span>
              <span className={holding.change_percent >= 0 ? 'text-[#4ade80]' : 'text-red-400'}>
                {holding.change_percent >= 0 ? '+' : ''}{holding.change_percent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Pending Settlements Card
function PendingSettlementsCard({ expenses, loading, onSettle }: {
  expenses: DashboardData['expenses'],
  loading: boolean,
  onSettle: () => void
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

  return (
    <Card className="bg-[#1a2744] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Shared Expenses
          <Badge variant="secondary">{expenses.pending_count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">You Owe</p>
            <p className="text-2xl font-bold text-red-400">${expenses.you_owe.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Owed to You</p>
            <p className="text-2xl font-bold text-[#4ade80]">${expenses.owed_to_you.toFixed(2)}</p>
          </div>
        </div>
        {expenses.pending_count > 0 && (
          <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]" onClick={onSettle}>
            <FiDollarSign className="mr-2" />
            Settle Up
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Quick Actions Bar
function QuickActionsBar() {
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)

  return (
    <>
      <Card className="bg-[#1a2744] border-gray-700">
        <CardContent className="p-4">
          <div className="flex gap-3 justify-around">
            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
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
                    <Input placeholder="Dinner at restaurant" className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" className="bg-gray-800 border-gray-700" />
                  </div>
                  <div>
                    <Label>Group</Label>
                    <Input placeholder="Roommates" className="bg-gray-800 border-gray-700" />
                  </div>
                  <Button className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
                    Add Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="flex-1">
              <FiLink className="mr-2" />
              Link Account
            </Button>
            <Button variant="outline" className="flex-1">
              <FiBell className="mr-2" />
              Set Reminder
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Autopays & Subscriptions Screen
function AutopaysScreen({ data, loading, onAction }: {
  data: DashboardData,
  loading: boolean,
  onAction: (id: string, action: string) => void
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  const filteredAutopays = data.autopays.filter(ap =>
    filter === 'all' || ap.status === filter
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Payments & Subscriptions</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <FiFilter className="mr-2" />
            Filter
          </Button>
          <Button size="sm" variant="outline">
            <FiCalendar className="mr-2" />
            Calendar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="autopays" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="autopays">Autopays</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="autopays" className="space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              size="sm"
              variant={filter === 'approved' ? 'default' : 'outline'}
              onClick={() => setFilter('approved')}
            >
              Approved
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAutopays.map(payment => (
                <Card key={payment.id} className="bg-[#1a2744] border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{payment.name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <FiCalendar />
                            {payment.due_date}
                          </div>
                          <Badge variant="secondary">{payment.category}</Badge>
                          <Badge variant={payment.status === 'approved' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-2xl font-bold text-white">${payment.amount.toFixed(2)}</p>
                      </div>
                      {payment.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => onAction(payment.id, 'approve')}
                            className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]"
                          >
                            <FiCheck className="mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction(payment.id, 'delay')}
                          >
                            <FiClock className="mr-1" /> Delay
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.subscriptions.map(sub => (
                <Card key={sub.id} className="bg-[#1a2744] border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{sub.name}</h3>
                        <p className="text-gray-400 text-sm">{sub.category}</p>
                      </div>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-white">${sub.amount}</p>
                        <p className="text-gray-400 text-xs">per {sub.billing_cycle}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          {sub.status === 'active' ? <FiPause /> : <FiPlay />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onAction(sub.id, 'cancel')}>
                          <FiX />
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-3 bg-gray-700" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Next billing</span>
                      <span className="text-gray-300">{sub.next_billing_date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Shared Expenses Screen
function ExpensesScreen({ data, loading, onSettle }: {
  data: DashboardData,
  loading: boolean,
  onSettle: (id: string) => void
}) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const groups = Array.from(new Set(data.expenses.items.map(e => e.group)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Shared Expenses</h2>
        <Button className="bg-[#4ade80] hover:bg-[#22c55e] text-[#1a2744]">
          <FiPlus className="mr-2" />
          Add Expense
        </Button>
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
        >
          All Groups
        </Button>
        {groups.map(group => (
          <Button
            key={group}
            size="sm"
            variant={selectedGroup === group ? 'default' : 'outline'}
            onClick={() => setSelectedGroup(group)}
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
                        <h3 className="text-white font-semibold">{expense.description}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary">{expense.group}</Badge>
                          <p className="text-gray-400 text-sm">{expense.date}</p>
                          <p className="text-gray-400 text-sm">
                            {expense.participants.length} participants
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

// Investments Screen
function InvestmentsScreen({ data, loading }: {
  data: DashboardData,
  loading: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Investment Portfolio</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <FiPieChart className="mr-2" />
            Allocation
          </Button>
          <Button size="sm" variant="outline">
            <FiBarChart2 className="mr-2" />
            Performance
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <Card className="bg-gradient-to-br from-[#1a2744] to-[#2d3f5f] border-gray-700">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Value</p>
              <p className="text-4xl font-bold text-white">
                ${data.investments.total_value.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Today's Change</p>
              <p className={`text-4xl font-bold ${
                data.investments.daily_change >= 0 ? 'text-[#4ade80]' : 'text-red-400'
              }`}>
                {data.investments.daily_change >= 0 ? '+' : ''}
                ${data.investments.daily_change.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Change %</p>
              <p className={`text-4xl font-bold ${
                data.investments.daily_change_percent >= 0 ? 'text-[#4ade80]' : 'text-red-400'
              }`}>
                {data.investments.daily_change_percent >= 0 ? '+' : ''}
                {data.investments.daily_change_percent.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </>
        ) : (
          <>
            {data.investments.holdings.map(holding => (
              <Card key={holding.symbol} className="bg-[#1a2744] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{holding.symbol}</h3>
                      <p className="text-gray-400 text-sm">{holding.name}</p>
                    </div>
                    <Badge variant={holding.change_percent >= 0 ? 'default' : 'destructive'}>
                      {holding.change_percent >= 0 ? '+' : ''}{holding.change_percent.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Current Price</span>
                      <span className="text-white font-semibold">${holding.current_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Shares</span>
                      <span className="text-white font-semibold">{holding.shares}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Total Value</span>
                      <span className="text-white font-bold">${holding.value.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Change</span>
                      <span className={holding.change_amount >= 0 ? 'text-[#4ade80]' : 'text-red-400'}>
                        {holding.change_amount >= 0 ? '+' : ''}${holding.change_amount.toFixed(2)}
                      </span>
                    </div>
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

// Main App Component
export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>({
    health: null,
    autopays: [],
    subscriptions: [],
    investments: {
      total_value: 0,
      daily_change: 0,
      daily_change_percent: 0,
      holdings: []
    },
    expenses: {
      you_owe: 0,
      owed_to_you: 0,
      pending_count: 0,
      items: []
    }
  })

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Call Financial Insights Coordinator to get overview
      const insightsResult = await callAIAgent(
        'Get my financial overview including health score, upcoming payments, subscriptions, investments, and shared expenses',
        AGENT_IDS.FINANCIAL_INSIGHTS
      )

      if (insightsResult.success) {
        // Parse the response and populate data
        const responseData = insightsResult.response.result

        // Mock data structure - in production, parse from actual agent responses
        setData({
          health: {
            score: 78,
            trend: 'up',
            factors: {
              payment_reliability: 85,
              subscription_efficiency: 72,
              investment_performance: 80,
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
              auto_renew: true
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
            }
          ],
          investments: {
            total_value: 45280.50,
            daily_change: 328.75,
            daily_change_percent: 0.73,
            holdings: [
              {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                value: 15420.00,
                shares: 100,
                purchase_price: 145.50,
                current_price: 154.20,
                change_percent: 2.3,
                change_amount: 230.00
              },
              {
                symbol: 'TSLA',
                name: 'Tesla Inc.',
                value: 12850.00,
                shares: 50,
                purchase_price: 245.00,
                current_price: 257.00,
                change_percent: 4.9,
                change_amount: 600.00
              },
              {
                symbol: 'MSFT',
                name: 'Microsoft Corp.',
                value: 8920.50,
                shares: 25,
                purchase_price: 340.00,
                current_price: 356.82,
                change_percent: 4.95,
                change_amount: 420.50
              },
              {
                symbol: 'GOOGL',
                name: 'Alphabet Inc.',
                value: 5890.00,
                shares: 40,
                purchase_price: 140.00,
                current_price: 147.25,
                change_percent: 5.18,
                change_amount: 290.00
              },
              {
                symbol: 'NVDA',
                name: 'NVIDIA Corp.',
                value: 2200.00,
                shares: 5,
                purchase_price: 420.00,
                current_price: 440.00,
                change_percent: 4.76,
                change_amount: 100.00
              }
            ]
          },
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
                settled: false
              },
              {
                id: 'e2',
                description: 'Grocery Shopping',
                total_amount: 186.40,
                your_share: 93.20,
                group: 'Roommates',
                participants: ['You', 'Jordan'],
                date: 'Feb 3, 2026',
                settled: false
              },
              {
                id: 'e3',
                description: 'Uber to Airport',
                total_amount: 45.00,
                your_share: 22.50,
                group: 'Travel',
                participants: ['You', 'Chris'],
                date: 'Feb 1, 2026',
                settled: true
              },
              {
                id: 'e4',
                description: 'Concert Tickets',
                total_amount: 240.00,
                your_share: 60.00,
                group: 'Friends',
                participants: ['You', 'Alex', 'Sam', 'Taylor'],
                date: 'Jan 28, 2026',
                settled: false
              }
            ]
          }
        })
      } else {
        setError(insightsResult.error || 'Failed to load dashboard data')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'delay') => {
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
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: string) => {
    const result = await callAIAgent(
      `${action} subscription with ID ${subscriptionId}`,
      AGENT_IDS.SUBSCRIPTION_CONTROL
    )

    if (result.success) {
      loadDashboardData() // Reload data
    }
  }

  const handleExpenseSettlement = async (expenseId: string) => {
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
              <AlertDescription className="text-red-400">
                {error}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4"
                  onClick={loadDashboardData}
                >
                  <FiRefreshCw className="mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                  <p className="text-gray-400 mt-1">Your financial overview</p>
                </div>
                <Button onClick={loadDashboardData} variant="outline" size="sm">
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <FinancialHealthCard health={data.health} loading={loading} />
                </div>
                <div className="lg:col-span-2">
                  <UpcomingPaymentsCard
                    autopays={data.autopays}
                    loading={loading}
                    onAction={handlePaymentAction}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <SubscriptionSummaryCard
                  subscriptions={data.subscriptions}
                  loading={loading}
                  onManage={() => setActiveTab('autopays')}
                />
                <InvestmentSnapshotCard
                  investments={data.investments}
                  loading={loading}
                />
              </div>

              <PendingSettlementsCard
                expenses={data.expenses}
                loading={loading}
                onSettle={() => setActiveTab('expenses')}
              />

              <QuickActionsBar />
            </div>
          )}

          {/* Autopays View */}
          {activeTab === 'autopays' && (
            <AutopaysScreen
              data={data}
              loading={loading}
              onAction={handleSubscriptionAction}
            />
          )}

          {/* Expenses View */}
          {activeTab === 'expenses' && (
            <ExpensesScreen
              data={data}
              loading={loading}
              onSettle={handleExpenseSettlement}
            />
          )}

          {/* Investments View */}
          {activeTab === 'investments' && (
            <InvestmentsScreen
              data={data}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  )
}
