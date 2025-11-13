import Navbar from '@/components/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar variant="standard" />
      {children}
    </>
  );
}
