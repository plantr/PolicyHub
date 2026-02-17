import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPolicySchema } from "@shared/schema";
import { useCreatePolicy } from "@/hooks/use-policies";
import { useBusinessUnits } from "@/hooks/use-business-units";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Extend schema for form validation
const formSchema = insertPolicySchema.extend({
  businessUnitId: z.coerce.number().optional(), // Handle string -> number coercion
});

type FormData = z.infer<typeof formSchema>;

export function CreatePolicyDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createPolicy = useCreatePolicy();
  const { data: businessUnits } = useBusinessUnits();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Draft",
      version: "v1.0",
      type: "Policy",
      content: "# New Policy\n\nEnter content here...",
      owner: "Compliance Team",
    }
  });

  const onSubmit = (data: FormData) => {
    createPolicy.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({
          title: "Policy created",
          description: "The new policy has been successfully created.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
          <Plus className="w-4 h-4" />
          New Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>
            Add a new policy to the library.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Policy Title</Label>
              <Input id="title" {...form.register("title")} placeholder="e.g. Anti-Money Laundering Policy" />
              {form.formState.errors.title && <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(v) => form.setValue("type", v)} defaultValue="Policy">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Policy">Policy</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Procedure">Procedure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bu">Business Unit</Label>
              <Select onValueChange={(v) => form.setValue("businessUnitId", Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Business Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Global / Group Level</SelectItem>
                  {businessUnits?.map(bu => (
                    <SelectItem key={bu.id} value={String(bu.id)}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input id="owner" {...form.register("owner")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Initial Content (Markdown)</Label>
            <Textarea 
              id="content" 
              className="font-mono text-sm min-h-[150px]" 
              {...form.register("content")} 
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createPolicy.isPending}>
              {createPolicy.isPending ? "Creating..." : "Create Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
