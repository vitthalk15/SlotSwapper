import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Calendar, Repeat, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
      navigate('/auth');
    }
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SlotSwapper
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">My Calendar</span>
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Repeat className="w-4 h-4" />
                  <span className="hidden sm:inline">Marketplace</span>
                </Button>
              </Link>
              <Link to="/requests">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Requests</span>
                </Button>
              </Link>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
