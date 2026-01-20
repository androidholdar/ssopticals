import { useCategories } from "@/hooks/use-categories";
import { useCustomers } from "@/hooks/use-customers";
import { useWholesale } from "@/hooks/use-wholesale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Box, ArrowRight, Activity, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: categories } = useCategories();
  const { data: customers } = useCustomers({ 
    from: format(new Date(), 'yyyy-MM-dd') 
  });
  const { isUnlocked } = useWholesale();

  const totalCategories = categories?.length || 0;
  const recentCustomers = customers?.length || 0;

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to OptiFlow Manager.</p>
        </div>
        <Link href="/customers">
          <Button className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Customers</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">+ from yesterday</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lens</CardTitle>
            <Box className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground mt-1">Active items & folders</p>
          </CardContent>
        </Card>

        <Card className={isUnlocked 
          ? "hover:shadow-lg transition-all border-l-4 border-l-green-500 bg-green-50/50"
          : "hover:shadow-lg transition-all border-l-4 border-l-gray-400"
        }>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mode Status</CardTitle>
            <Activity className={isUnlocked ? "w-4 h-4 text-green-600" : "w-4 h-4 text-gray-400"} />
          </CardHeader>
          <CardContent>
            <div className={isUnlocked ? "text-2xl font-bold text-green-700" : "text-2xl font-bold text-gray-600"}>
              {isUnlocked ? "Wholesale" : "Retail Only"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isUnlocked ? "Wholesale prices visible" : "Prices hidden"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link href="/categories" className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Lens</div>
                  <div className="text-sm text-muted-foreground">Update prices and categories</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            <Link href="/settings" className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Configure Presets</div>
                  <div className="text-sm text-muted-foreground">Customize customer forms</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
            <CardDescription>Latest additions today</CardDescription>
          </CardHeader>
          <CardContent>
            {customers && customers.length > 0 ? (
              <div className="space-y-4">
                {customers.slice(0, 5).map(customer => (
                  <div key={customer.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.mobile || "No mobile"}</div>
                    </div>
                    <div className="text-xs font-medium bg-secondary px-2 py-1 rounded-md">
                      {customer.lensPowerCurrent || "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mb-2 opacity-20" />
                <p>No customers added today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
