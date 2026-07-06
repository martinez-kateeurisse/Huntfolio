import { getContacts, getApplications } from "@/lib/queries";
import { ContactList } from "@/components/contacts/contact-list";

export const metadata = { title: "Contacts · Huntfolio" };

export default async function ContactsPage() {
  const [contacts, applications] = await Promise.all([
    getContacts(),
    getApplications(),
  ]);
  const appOptions = applications.map((a) => ({ id: a.id, company: a.company }));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ContactList contacts={contacts} applications={appOptions} />
    </div>
  );
}
