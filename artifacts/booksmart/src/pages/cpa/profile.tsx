import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function CpaProfile() {
  const handleSave = () => {
    toast.success("CPA Profile updated successfully.");
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CPA Profile</h1>
          <p className="text-muted-foreground">Manage your public profile and firm details.</p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Verified Professional</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-border/50 h-fit">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704z" />
              <AvatarFallback className="text-4xl bg-primary/10 text-primary">CPA</AvatarFallback>
            </Avatar>
            <Button variant="outline" className="w-full">Upload New</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
            <CardDescription>This information is visible to potential clients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" defaultValue="Sarah" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" defaultValue="Jenkins" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input id="title" defaultValue="Certified Public Accountant" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input id="rate" type="number" defaultValue="150" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties (comma separated)</Label>
              <Input id="specialties" defaultValue="Freelancers, E-commerce, Real Estate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea id="bio" className="min-h-[120px]" defaultValue="Over 10 years of experience helping independent contractors and small business owners minimize their tax liability and maximize growth. Former IRS auditor with deep knowledge of pass-through entity taxation." />
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