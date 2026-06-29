import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Profile() {
  const handleSave = () => {
    toast.success("Profile updated successfully.");
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal and business details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-border/50 h-fit">
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704a" />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">JD</AvatarFallback>
            </Avatar>
            <Button variant="outline" className="w-full">Upload New</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>This information will be shared with your CPA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID (SSN/EIN)</Label>
              <Input id="taxId" type="password" defaultValue="***-**-1234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" defaultValue="123 Main St, Suite 400&#10;San Francisco, CA 94105" />
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/5 border-t border-border/20 pt-4">
            <Button onClick={handleSave} className="ml-auto">Save Changes</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}