import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, ArrowRightLeft, Store } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  _id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
  };
}

interface MyEvent {
  _id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

const Marketplace = () => {
  const { user } = useAuth();
  const [swappableEvents, setSwappableEvents] = useState<Event[]>([]);
  const [mySwappableEvents, setMySwappableEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch swappable events from other users
      const swappableResult = await apiClient.getSwappableEvents();
      if (swappableResult.error) {
        toast.error('Failed to fetch available slots');
        console.error(swappableResult.error);
        setSwappableEvents([]);
      } else {
        const eventsArray = Array.isArray(swappableResult.data) ? swappableResult.data : [];
        setSwappableEvents(eventsArray);
      }

      // Fetch user's own swappable events
      const myEventsResult = await apiClient.getMySwappableEvents();
      if (myEventsResult.error) {
        toast.error('Failed to fetch your swappable slots');
        console.error(myEventsResult.error);
        setMySwappableEvents([]);
      } else {
        const eventsArray = Array.isArray(myEventsResult.data) ? myEventsResult.data : [];
        setMySwappableEvents(eventsArray);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
      setSwappableEvents([]);
      setMySwappableEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const requestSwap = async (myEventId: string, theirEventId: string) => {
    const result = await apiClient.createSwapRequest(myEventId, theirEventId);

    if (result.error) {
      toast.error(result.error.message || 'Failed to create swap request');
    } else {
      toast.success('Swap request sent!');
      setDialogOpen(false);
      fetchData();
    }
  };

  const openSwapDialog = (event: Event) => {
    if (mySwappableEvents.length === 0) {
      toast.error('You need at least one swappable event to request a swap');
      return;
    }
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Browse and swap available time slots</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : swappableEvents.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Store className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No slots available</h3>
              <p className="text-muted-foreground">Check back later for swappable slots</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {swappableEvents.map((event) => (
              <Card key={event._id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <Badge className="bg-accent">Swappable</Badge>
                  </div>
                  <CardDescription>
                    By {event.user_id?.name || 'Unknown User'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm font-medium">
                      {format(new Date(event.start_time), 'PPP')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(event.start_time), 'p')} - {format(new Date(event.end_time), 'p')}
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={() => openSwapDialog(event)}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Request Swap
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Your Slot to Swap</DialogTitle>
              <DialogDescription>
                Choose one of your swappable slots to offer in exchange
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {mySwappableEvents.map((event) => (
                <Card
                  key={event._id}
                  className="cursor-pointer hover:bg-accent/5 transition-colors"
                  onClick={() => selectedEvent && requestSwap(event._id, selectedEvent._id)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(event.start_time), 'PPP')} • {format(new Date(event.start_time), 'p')}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Marketplace;
