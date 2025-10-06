// src/components/FeaturesGrid.tsx
"use client"; // This directive marks this as a Client Component

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DailySummary from "@/components/DailySummary";
import { BarChart3, MessageCircle, PiggyBank } from "lucide-react";

// The FeatureCard component can be defined here as well
function FeatureCard({ title, description, href, icon: Icon }: { title: string, description: string, href: string, icon: React.ElementType }) {
  return (
    <Link href={href} className="block hover:scale-[1.02] transition-transform duration-200">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-md">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// This is the main component that uses framer-motion
export default function FeaturesGrid({ summary }: { summary: any }) {
  return (
    <motion.div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      <div className="lg:col-span-3">
        <DailySummary summary={summary} />
      </div>
      <FeatureCard
        title="Personal Watchlist"
        description="Track your favorite stocks, bonds, and funds. Get real-time updates and set price alerts."
        href="/watchlist"
        icon={BarChart3}
      />
      <FeatureCard
        title="Financial Calculators"
        description="Estimate returns on Tanzanian treasury and corporate bonds with our easy-to-use calculator."
        href="/calculators/bond"
        icon={PiggyBank}
      />
      <FeatureCard
        title="Community Chat"
        description="Join the conversation. Discuss market trends and share insights with other investors in our chatrooms."
        href="/chat"
        icon={MessageCircle}
      />
    </motion.div>
  );
}