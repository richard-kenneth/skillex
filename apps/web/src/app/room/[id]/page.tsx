"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RoomPage() {
  const params = useParams();
  const roomName = params.id as string;
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
      return;
    }

    if (session?.user?.name) {
      const setupRoom = async () => {
        try {
          const resp = await fetch(
            `/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(session.user!.name!)}`
          );
          
          if (!resp.ok) {
            throw new Error(`Failed to fetch token: ${resp.statusText}. Ensure LiveKit keys are set.`);
          }
          const data = await resp.json();
          setToken(data.token);
        } catch (e: unknown) {
          console.error(e);
          const message = e instanceof Error ? e.message : "Unknown error";
          setError(message);
        }
      };
      
      setupRoom();
    }
  }, [roomName, session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-xl mt-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>LiveKit Connection Error</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            {error}
            <br /><br />
            To enable video rooms, ensure you have <code className="bg-destructive/20 px-1 py-0.5 rounded">LIVEKIT_API_KEY</code>, <code className="bg-destructive/20 px-1 py-0.5 rounded">LIVEKIT_API_SECRET</code>, and <code className="bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_LIVEKIT_URL</code> set in your `.env` file!
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/dashboard")} className="mt-4" variant="outline">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Connecting to Skill Exchange Room: {roomName}...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full bg-zinc-950 flex flex-col relative">
      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur border border-white/10 rounded-full text-white text-sm font-medium">
        Room: {roomName}
      </div>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        style={{ height: "100%" }}
        onDisconnected={() => router.push("/dashboard")}
      >
        <MyVideoConference />
        <RoomAudioRenderer />
        <ControlBar variation="minimal" />
      </LiveKitRoom>
    </div>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 120px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
