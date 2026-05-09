import { Contact } from '@/types/split';
import { storageEngine } from './storage-engine';

const CONTACTS_KEY = 'reimburse_contacts';

export const contactService = {
  getContacts(): Contact[] {
    try {
      const stored = localStorage.getItem(CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveContacts(contacts: Contact[]): void {
    storageEngine.set(CONTACTS_KEY, JSON.stringify(contacts));
  },

  addContact(contact: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const contacts = this.getContacts();
    const newContact: Contact = {
      ...contact,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    contacts.unshift(newContact);
    this.saveContacts(contacts);
    return newContact;
  },

  updateContact(contact: Contact): void {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index !== -1) {
      contacts[index] = contact;
      this.saveContacts(contacts);
    }
  },

  deleteContact(id: string): void {
    const contacts = this.getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    this.saveContacts(filtered);
  }
};
