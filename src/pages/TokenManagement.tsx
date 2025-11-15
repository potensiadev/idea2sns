import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const PLATFORMS = [{ id: "twitter", name: "X (Twitter)", icon: "🐦" }];

type SocialAccount = Tables<"social_accounts">;

type FormState = {
  platform: string;
  account_name: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
};

const tokenSchema = z.object({
  platform: z.enum(["twitter"], {
    required_error: "플랫폼을 선택하세요",
  }),
  account_name: z.string().max(100, "계정 이름은 100자 이하여야 합니다").optional().or(z.literal("")),
  access_token: z
    .string()
    .min(10, "액세스 토큰은 최소 10자 이상이어야 합니다")
    .max(1000, "액세스 토큰이 너무 깁니다"),
  refresh_token: z
    .string()
    .min(10, "리프레시 토큰은 최소 10자 이상이어야 합니다")
    .max(1000, "리프레시 토큰이 너무 깁니다")
    .optional()
    .or(z.literal("")),
  token_expires_at: z
    .string({ required_error: "만료 시간을 선택하세요" })
    .min(1, "만료 시간을 선택하세요")
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "만료 시간은 현재 이후여야 합니다",
    }),
});

const initialFormState: FormState = {
  platform: "",
  account_name: "",
  access_token: "",
  refresh_token: "",
  token_expires_at: "",
};

const formatDateForInput = (isoDate: string | null) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDateTime = (isoDate: string | null) => {
  if (!isoDate) return "만료 정보 없음";
  return new Date(isoDate).toLocaleString("ko-KR");
};

const maskToken = (token?: string | null) => {
  if (!token) return "-";
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
};

const TokenManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const fetchAccounts = async (): Promise<SocialAccount[]> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("인증 정보가 없습니다");

    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  };

  const {
    data: accounts = [],
    isLoading,
  } = useQuery({
    queryKey: ["social_accounts"],
    queryFn: fetchAccounts,
    retry: 1,
  });

  const createAccount = async (payload: TablesInsert<"social_accounts">) => {
    // Encrypt tokens before saving
    const { data: encryptionData, error: encryptionError } = await supabase
      .functions.invoke("encrypt-token", {
        body: {
          access_token: payload.access_token,
          refresh_token: payload.refresh_token || null,
        },
      });

    if (encryptionError) {
      throw encryptionError;
    }

    if (!encryptionData?.success || !encryptionData.encrypted_access_token) {
      throw new Error("토큰 암호화에 실패했습니다");
    }

    const encryptedPayload = {
      ...payload,
      access_token: encryptionData.encrypted_access_token,
      refresh_token: encryptionData.encrypted_refresh_token || null,
    };

    const { data, error } = await supabase
      .from("social_accounts")
      .insert(encryptedPayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateAccount = async ({ id, values }: { id: string; values: TablesUpdate<"social_accounts"> }) => {
    // Encrypt tokens before updating
    const { data: encryptionData, error: encryptionError } = await supabase
      .functions.invoke("encrypt-token", {
        body: {
          access_token: values.access_token as string,
          refresh_token: (values.refresh_token as string) || null,
        },
      });

    if (encryptionError) {
      throw encryptionError;
    }

    if (!encryptionData?.success || !encryptionData.encrypted_access_token) {
      throw new Error("토큰 암호화에 실패했습니다");
    }

    const encryptedValues = {
      ...values,
      access_token: encryptionData.encrypted_access_token,
      refresh_token: encryptionData.encrypted_refresh_token || null,
    };

    const { data, error } = await supabase
      .from("social_accounts")
      .update(encryptedValues)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
    if (error) throw error;
    return id;
  };

  const insertMutation = useMutation({
    mutationFn: createAccount,
    onMutate: async (payload: TablesInsert<"social_accounts">) => {
      await queryClient.cancelQueries({ queryKey: ["social_accounts"] });
      const previousAccounts = queryClient.getQueryData<SocialAccount[]>(["social_accounts"]);

      const optimisticAccount: SocialAccount = {
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        account_name: payload.account_name ?? null,
        access_token: payload.access_token,
        platform: payload.platform,
        refresh_token: payload.refresh_token ?? null,
        token_expires_at: payload.token_expires_at ?? null,
        user_id: payload.user_id,
      };

      queryClient.setQueryData<SocialAccount[]>(["social_accounts"], (old = []) => [optimisticAccount, ...old]);
      return { previousAccounts };
    },
    onSuccess: (data) => {
      const platformLabel = PLATFORMS.find((p) => p.id === data.platform)?.name ?? "플랫폼";
      toast.success(`${platformLabel} 토큰이 저장되었습니다`);
      setIsDialogOpen(false);
      setFormData(initialFormState);
      setEditingAccount(null);
    },
    onError: (error: any, _, context) => {
      toast.error(error.message ?? "토큰 저장에 실패했습니다");
      if (context?.previousAccounts) {
        queryClient.setQueryData(["social_accounts"], context.previousAccounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["social_accounts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAccount,
    onMutate: async ({ id, values }: { id: string; values: TablesUpdate<"social_accounts"> }) => {
      await queryClient.cancelQueries({ queryKey: ["social_accounts"] });
      const previousAccounts = queryClient.getQueryData<SocialAccount[]>(["social_accounts"]);

      queryClient.setQueryData<SocialAccount[]>(["social_accounts"], (old = []) =>
        old.map((account) => (account.id === id ? ({ ...account, ...values } as SocialAccount) : account))
      );

      return { previousAccounts };
    },
    onSuccess: (data) => {
      const platformLabel = PLATFORMS.find((p) => p.id === data.platform)?.name ?? "플랫폼";
      toast.success(`${platformLabel} 토큰이 수정되었습니다`);
      setIsDialogOpen(false);
      setEditingAccount(null);
      setFormData(initialFormState);
    },
    onError: (error: any, _, context) => {
      toast.error(error.message ?? "토큰 수정에 실패했습니다");
      if (context?.previousAccounts) {
        queryClient.setQueryData(["social_accounts"], context.previousAccounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["social_accounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (account: SocialAccount) => deleteAccount(account.id),
    onMutate: async (account: SocialAccount) => {
      await queryClient.cancelQueries({ queryKey: ["social_accounts"] });
      const previousAccounts = queryClient.getQueryData<SocialAccount[]>(["social_accounts"]);
      queryClient.setQueryData<SocialAccount[]>(["social_accounts"], (old = []) =>
        old.filter((item) => item.id !== account.id)
      );
      return { previousAccounts };
    },
    onSuccess: (_, account) => {
      const platformLabel = PLATFORMS.find((p) => p.id === account.platform)?.name ?? "플랫폼";
      toast.success(`${platformLabel} 토큰이 삭제되었습니다`);
    },
    onError: (error: any, _, context) => {
      toast.error(error.message ?? "토큰 삭제에 실패했습니다");
      if (context?.previousAccounts) {
        queryClient.setQueryData(["social_accounts"], context.previousAccounts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["social_accounts"] });
    },
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingAccount(null);
      setFormData(initialFormState);
    }
  };

  const handleOpenDialog = (account?: SocialAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        platform: account.platform,
        account_name: account.account_name ?? "",
        access_token: account.access_token,
        refresh_token: account.refresh_token ?? "",
        token_expires_at: formatDateForInput(account.token_expires_at),
      });
    } else {
      setEditingAccount(null);
      setFormData(initialFormState);
    }
    setIsDialogOpen(true);
  };

  const handleSaveToken = async () => {
    const validationResult = tokenSchema.safeParse(formData);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      toast.error(userError.message);
      return;
    }

    if (!user) {
      toast.error("인증 정보가 없습니다");
      return;
    }

    const sharedValues = {
      platform: formData.platform,
      account_name: formData.account_name || null,
      access_token: formData.access_token,
      refresh_token: formData.refresh_token || null,
      token_expires_at: new Date(formData.token_expires_at).toISOString(),
    } satisfies TablesUpdate<"social_accounts">;

    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        values: sharedValues,
      });
    } else {
      const insertPayload: TablesInsert<"social_accounts"> = {
        ...sharedValues,
        user_id: user.id,
      };
      insertMutation.mutate(insertPayload);
    }
  };

  const handleDelete = (account: SocialAccount) => {
    deleteMutation.mutate(account);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSaving = insertMutation.isPending || updateMutation.isPending;
  const deletingAccount = deleteMutation.variables as SocialAccount | undefined;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">소셜 미디어 토큰 관리</h1>
            <p className="text-muted-foreground">
              각 플랫폼의 액세스 토큰과 만료 시간을 등록하여 안정적으로 업로드 자동화를 수행하세요
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                토큰 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "토큰 수정" : "새 토큰 추가"}</DialogTitle>
                <DialogDescription>소셜 미디어 플랫폼의 API 토큰과 만료 시각을 입력하세요</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">플랫폼</Label>
                  <select
                    id="platform"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    disabled={!!editingAccount}
                  >
                    <option value="">선택하세요</option>
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_name">계정 이름 (선택사항)</Label>
                  <Input
                    id="account_name"
                    placeholder="@username"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="access_token">액세스 토큰</Label>
                  <div className="relative">
                    <Input
                      id="access_token"
                      type={showToken ? "text" : "password"}
                      placeholder="토큰을 입력하세요"
                      value={formData.access_token}
                      onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="refresh_token">리프레시 토큰 (선택사항)</Label>
                  <Input
                    id="refresh_token"
                    type={showToken ? "text" : "password"}
                    placeholder="리프레시 토큰을 입력하세요"
                    value={formData.refresh_token}
                    onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="token_expires_at">토큰 만료 시간</Label>
                  <Input
                    id="token_expires_at"
                    type="datetime-local"
                    value={formData.token_expires_at}
                    onChange={(e) => setFormData({ ...formData, token_expires_at: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                  취소
                </Button>
                <Button onClick={handleSaveToken} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              등록된 토큰이 없습니다. 위의 "토큰 추가" 버튼을 클릭하여 시작하세요.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>등록된 토큰</CardTitle>
              <CardDescription>민감한 토큰 정보는 마스킹된 상태로 노출됩니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>플랫폼</TableHead>
                      <TableHead>계정 이름</TableHead>
                      <TableHead>액세스 토큰</TableHead>
                      <TableHead>리프레시 토큰</TableHead>
                      <TableHead>만료 시각</TableHead>
                      <TableHead className="text-right">동작</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const platform = PLATFORMS.find((p) => p.id === account.platform);
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{platform?.icon}</span>
                              {platform?.name}
                            </div>
                          </TableCell>
                          <TableCell>{account.account_name ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{maskToken(account.access_token)}</TableCell>
                          <TableCell className="font-mono text-xs">{maskToken(account.refresh_token)}</TableCell>
                          <TableCell>{formatDateTime(account.token_expires_at)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(account)}>
                              수정
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(account)}
                              disabled={deleteMutation.isPending && deletingAccount?.id === account.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 md:hidden">
                {accounts.map((account) => {
                  const platform = PLATFORMS.find((p) => p.id === account.platform);
                  return (
                    <Card key={`${account.id}-mobile`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <span>{platform?.icon}</span>
                            {platform?.name}
                          </CardTitle>
                          <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(account)}>
                              수정
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(account)}
                              disabled={deleteMutation.isPending && deletingAccount?.id === account.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {account.account_name && <CardDescription>{account.account_name}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">액세스</span>
                          <span className="font-mono">{maskToken(account.access_token)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">리프레시</span>
                          <span className="font-mono">{maskToken(account.refresh_token)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">만료</span>
                          <span>{formatDateTime(account.token_expires_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TokenManagement;
