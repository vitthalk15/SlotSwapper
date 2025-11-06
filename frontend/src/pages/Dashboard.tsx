import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Clock, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  _id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING';
}

const Dashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getEvents();

      if (result.error) {
        toast.error('Failed to fetch events');
        console.error(result.error);
        setEvents([]);
      } else {
        // Ensure we have an array
        const eventsArray = Array.isArray(result.data) ? result.data : [];
        setEvents(eventsArray);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startDate || !startTime || !endDate || !endTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      toast.error('End time must be after start time');
      return;
    }

    const result = await apiClient.createEvent({
      title,
      start_time: startDateTime,
      end_time: endDateTime,
      status: 'BUSY',
    });

    if (result.error) {
      toast.error('Failed to create event');
      console.error(result.error);
    } else {
      toast.success('Event created successfully');
      setTitle('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setOpen(false);
      fetchEvents();
    }
  };

  const toggleSwappable = async (eventId: string, currentStatus: string) => {
    if (currentStatus === 'SWAP_PENDING') {
      toast.error('Cannot modify events with pending swaps');
      return;
    }

    const newStatus = currentStatus === 'BUSY' ? 'SWAPPABLE' : 'BUSY';

    const result = await apiClient.updateEvent(eventId, { status: newStatus });

    if (result.error) {
      toast.error('Failed to update event');
    } else {
      toast.success(`Event marked as ${newStatus.toLowerCase()}`);
      fetchEvents();
    }
  };

  const deleteEvent = async (eventId: string) => {
    const result = await apiClient.deleteEvent(eventId);

    if (result.error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      fetchEvents();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BUSY':
        return <Badge variant="secondary">Busy</Badge>;
      case 'SWAPPABLE':
        return <Badge className="bg-accent">Swappable</Badge>;
      case 'SWAP_PENDING':
        return <Badge variant="outline">Swap Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Calendar</h1>
            <p className="text-muted-foreground">Manage your schedule and swappable slots</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow">
                <Plus className="w-4 h-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new event to your calendar
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Team Meeting"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-4">Create your first event to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event._id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    {getStatusBadge(event.status)}
                  </div>
                  <CardDescription>
                    {format(new Date(event.start_time), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(event.start_time), 'p')} - {format(new Date(event.end_time), 'p')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={event.status === 'SWAPPABLE' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleSwappable(event._id, event.status)}
                      disabled={event.status === 'SWAP_PENDING'}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {event.status === 'SWAPPABLE' ? 'Make Busy' : 'Make Swappable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteEvent(event._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
