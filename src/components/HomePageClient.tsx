// src/components/HomePageClient.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ArrowRight } from "lucide-react";

// --- 👇 The component now accepts a 'userName' prop 👇 ---
export default function HomePageClient({ userName }: { userName: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* --- 👇 Conditional Greeting 👇 --- */}
        {userName ? (
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 animated-gradient-text">
            Welcome back, {userName.split(' ')[0]}!
          </h1>
        ) : (
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 animated-gradient-text">
            Welcome to Malenga
          </h1>
        )}
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your trusted source for financial literacy in Tanzania. Take control of your financial future with powerful tools, real-time data, and a supportive community.
        </p>
      </motion.div>

      {/* --- 👇 Conditionally show buttons only if the user is logged out 👇 --- */}
      {!userName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/auth">
            <Button size="lg">
              Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}