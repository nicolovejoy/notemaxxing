"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { AdminConsole } from "./admin-console";

// Admin emails who can see admin console
const ADMIN_EMAILS = [
  'nicholas.lovejoy@gmail.com',
  'mlovejoy@scu.edu',
  // Add other admin emails as needed
];

export function UserMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdminConsole, setShowAdminConsole] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      console.error('[UserMenu] Supabase client is null - check environment variables');
      return;
    }
    
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initializeAuth = async () => {
      try {
        // Get initial user
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('[UserMenu] Error getting user:', error);
        } else {
          console.log('[UserMenu] User loaded:', data.user?.email);
          setUser(data.user);
        }
        
        // Listen for auth changes
        const authListener = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[UserMenu] Auth state changed:', event, session?.user?.email);
          setUser(session?.user ?? null);
        });
        subscription = authListener.data.subscription;
      } catch (err) {
        console.error('[UserMenu] Exception in initializeAuth:', err);
      }
    };
    
    initializeAuth();
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-md hover:bg-gray-100"
      >
        <User className="h-5 w-5 text-gray-800" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              {user.email}
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setShowAdminConsole(true);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin Console
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
      
      {/* Admin Console Modal */}
      {showAdminConsole && (
        <AdminConsole onClose={() => setShowAdminConsole(false)} />
      )}
    </div>
  );
}