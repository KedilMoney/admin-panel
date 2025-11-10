'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useDashboard } from '@/lib/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalysisPage() {
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [search, setSearch] = useState('');

  const { data: dashboardData, isLoading, refetch } = useDashboard(
    {
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
      search: search || undefined,
    },
    true
  );

  const handleDateChange = (field: 'fromDate' | 'toDate', value: string) => {
    setDateRange({ ...dateRange, [field]: value });
  };

  const summary = dashboardData?.summary || {
    assigned: 0,
    activity: 0,
    available: 0,
    credit: 0,
    debit: 0,
    overspent: 0,
  };

  const chartData = dashboardData?.groups?.map(group => ({
    name: group.name,
    allocated: group.allocated || 0,
    activity: group.activity || 0,
    available: group.available || 0,
  })) || [];

  const categoryChartData = dashboardData?.groups?.flatMap(group =>
    (group.categories || []).slice(0, 10).map(cat => ({
      name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
      allocated: cat.allocated || 0,
      available: cat.available || 0,
    }))
  ) || [];

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analysis & Reports</h1>
              <p className="mt-2 text-gray-600">Financial analysis and insights</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Date Range Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={dateRange.fromDate}
                    onChange={(e) => handleDateChange('fromDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={dateRange.toDate}
                    onChange={(e) => handleDateChange('toDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search categories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.assigned)}</div>
                <p className="text-xs text-gray-500">Budget allocated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.activity)}</div>
                <p className="text-xs text-gray-500">Transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.available)}</div>
                <p className="text-xs text-gray-500">Remaining balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overspent</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.overspent)}</div>
                <p className="text-xs text-gray-500">Over budget</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Group Budget Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="allocated" fill="#8884d8" name="Allocated" />
                    <Bar dataKey="activity" fill="#82ca9d" name="Activity" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="allocated" stroke="#8884d8" name="Allocated" />
                    <Line type="monotone" dataKey="available" stroke="#82ca9d" name="Available" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {dashboardData && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.groups?.map((group) => (
                    <div key={group.id} className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Allocated:</span>{' '}
                          <span className="font-medium">{formatCurrency(group.allocated || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Activity:</span>{' '}
                          <span className="font-medium">{formatCurrency(group.activity || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>{' '}
                          <span className="font-medium">{formatCurrency(group.available || 0)}</span>
                        </div>
                      </div>
                      {group.categories && group.categories.length > 0 && (
                        <div className="mt-2 ml-4 space-y-1">
                          {group.categories.map((cat) => (
                            <div key={cat.id} className="text-sm text-gray-600">
                              • {cat.name}: {formatCurrency(cat.allocated || 0)} allocated,{' '}
                              {formatCurrency(cat.available || 0)} available
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}

