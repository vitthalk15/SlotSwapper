import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Bell, Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface SwapRequest {
  _id: string;
  requester_event_id: {
    _id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  recipient_event_id: {
    _id: string;
    title: string;
    start_time: string;
    end_time: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  requester_id: {
    _id: string;
    name: string;
    email: string;
  };
  recipient_id: {
    _id: string;
    name: string;
    email: string;
  };
}

const Requests = () => {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    setLoading(true);

    try {
      // Fetch incoming requests
      const incomingResult = await apiClient.getIncomingSwapRequests();
      if (incomingResult.error) {
        toast.error('Failed to fetch incoming requests');
        console.error(incomingResult.error);
        setIncomingRequests([]);
      } else {
        const requestsArray = Array.isArray(incomingResult.data) ? incomingResult.data : [];
        setIncomingRequests(requestsArray);
      }

      // Fetch outgoing requests
      const outgoingResult = await apiClient.getOutgoingSwapRequests();
      if (outgoingResult.error) {
        toast.error('Failed to fetch outgoing requests');
        console.error(outgoingResult.error);
        setOutgoingRequests([]);
      } else {
        const requestsArray = Array.isArray(outgoingResult.data) ? outgoingResult.data : [];
        setOutgoingRequests(requestsArray);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to fetch requests');
      setIncomingRequests([]);
      setOutgoingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, accept: boolean) => {
    const result = await apiClient.respondToSwapRequest(requestId, accept);

    if (result.error) {
      toast.error(result.error.message || 'Failed to respond to swap request');
    } else {
      toast.success(accept ? 'Swap accepted!' : 'Swap rejected');
      fetchRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-success">Accepted</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Swap Requests</h1>
          <p className="text-muted-foreground">Manage your incoming and outgoing swap requests</p>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="incoming" className="gap-2">
              <Bell className="w-4 h-4" />
              Incoming ({incomingRequests.filter((r) => r.status === 'PENDING').length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Outgoing ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : incomingRequests.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No incoming requests</h3>
                  <p className="text-muted-foreground">You'll see swap requests from other users here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((request) => (
                  <Card key={request._id} className="shadow-md">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Swap Request from {request.requester_id?.name || 'Unknown User'}
                          </CardTitle>
                          <CardDescription>
                            {format(new Date(request.created_at), 'PPP')}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">They offer:</h4>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{request.requester_event_id.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.requester_event_id.start_time), 'PPP p')}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">For your:</h4>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{request.recipient_event_id.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.recipient_event_id.start_time), 'PPP p')}
                            </div>
                          </div>
                        </div>
                      </div>
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 gap-2 bg-success hover:bg-success/90"
                            onClick={() => handleResponse(request._id, true)}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1 gap-2"
                            onClick={() => handleResponse(request._id, false)}
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : outgoingRequests.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No outgoing requests</h3>
                  <p className="text-muted-foreground">Visit the marketplace to request swaps</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {outgoingRequests.map((request) => (
                  <Card key={request._id} className="shadow-md">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Swap Request to {request.recipient_id?.name || 'Unknown User'}
                          </CardTitle>
                          <CardDescription>
                            {format(new Date(request.created_at), 'PPP')}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">You offered:</h4>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{request.requester_event_id.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.requester_event_id.start_time), 'PPP p')}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">For their:</h4>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{request.recipient_event_id.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(request.recipient_event_id.start_time), 'PPP p')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Requests;
