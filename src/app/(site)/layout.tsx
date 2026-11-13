import { currentUser } from '@/lib/auth';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import Motion from '@/components/site/Motion';
import { ChatProvider } from '@/components/chat/Chat';
import './site.css';
import '@/components/chat/chat.css';

export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const chatUser = user ? { first_name: user.first_name, last_name: user.last_name, phone: user.phone, role: user.role } : null;
  return (
    <ChatProvider user={chatUser}>
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <Motion />
      <div className="site">
        <Header user={user ? { first_name: user.first_name, role: user.role } : null} />
        {children}
        <Footer />
      </div>
    </ChatProvider>
  );
}
