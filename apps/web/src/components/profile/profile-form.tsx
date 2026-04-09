"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useR2Upload } from "@/hooks/use-r2-upload";
import { authClient, useSession } from "@/lib/auth-client";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { ProfileFormPayload, ProfileFormSchema } from "@skil-ex2/shared";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { SkillManager } from "./skill-manager";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    image?: string | null;
    bio?: string | null;
    email: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { uploadFile, isUploading } = useR2Upload();
  const { refetch } = useSession();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  const form = useForm({
    resolver: valibotResolver(ProfileFormSchema),
    defaultValues: {
      name: user.name ?? "",
      bio: user.bio ?? "",
      image: user.image ?? "",
    },
  });

  async function onSubmit(values: ProfileFormPayload) {
    setIsSaving(true);
    try {
      const { error: authError } = await authClient.updateUser({
        name: values.name,
      });

      if (authError) throw authError;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ensure session cookies are sent
          body: JSON.stringify({ bio: values.bio }),
        },
      );

      if (!response.ok) throw new Error(t("failedUpdateBio"));

      toast.success(t("profileUpdated"));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : tCommon("error");
      console.error("Profile update error:", errorMessage);
      toast.error(t("profileUpdateError"));
    } finally {
      setIsSaving(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "avatar");

      form.setValue("image", url);

      await refetch();

      toast.success(t("avatarUploaded"));
    } catch {
      // Error handled by hook
    }
  };

  const avatarUrl = form.watch("image") || user.image;
  const displayName = form.watch("name") || user.name || "U";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden border-none shadow-lg">
        <CardHeader className="bg-primary/5 pb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20 transition-transform hover:scale-105">
              <AvatarImage
                src={avatarUrl ?? ""}
                alt={t("avatarAlt", { name: displayName })}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-center md:text-left">
              <CardTitle className="text-2xl font-bold">
                {displayName}
              </CardTitle>
              <CardDescription className="text-base">
                {user.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground/80">
                        {t("displayName")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("displayNamePlaceholder")}
                          {...field}
                          className="bg-background/50 focus:bg-background transition-colors"
                        />
                      </FormControl>
                      <FormDescription>
                        {t("displayNameDesc")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground/80">
                        {t("profilePicture")}
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-4">
                          <Input type="hidden" {...field} />
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isUploading}
                              className="relative"
                              onClick={() =>
                                document
                                  .getElementById("avatar-upload")
                                  ?.click()
                              }
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t("uploading")}
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  {t("uploadNewAvatar")}
                                </>
                              )}
                            </Button>
                            <input
                              id="avatar-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            {field.value && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground"
                                onClick={() => form.setValue("image", "")}
                              >
                                {tCommon("remove")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t("profilePictureDesc")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-foreground/80">
                      {t("bio")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("bioPlaceholder")}
                        className="resize-none min-h-[120px] bg-background/50 focus:bg-background transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("bioDesc")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end border-t pt-6 border-border/40">
                <Button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-8 shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  {isSaving ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <SkillManager _userId={user.id} />

      <Card className="border-destructive/20 bg-destructive/5 overflow-hidden border">
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
          <CardDescription>
            {t("dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="hover:bg-destructive/90 shadow-sm transition-colors"
          >
            {t("deleteAccount")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
