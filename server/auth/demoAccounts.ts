import type { AuthUser } from "./jwt.js";

export type DemoAccount = AuthUser & {
  accountId: string;
  label: string;
  password: string;
  description: string;
};

export const demoAccounts: DemoAccount[] = [
  {
    accountId: "advisor-demo",
    id: "00000000-0000-4000-8000-000000000001",
    email: "advisor@clarifi.demo",
    password: "clarifi-advisor",
    name: "Demo Advisor",
    role: "advisor",
    label: "Advisor demo",
    description: "Full advisor dashboard, recap approval, decision menu, and policy evidence controls."
  },
  {
    accountId: "client-demo",
    id: "00000000-0000-4000-8000-000000000002",
    email: "client@clarifi.demo",
    password: "clarifi-client",
    name: "Tan Li Wen",
    role: "client",
    label: "Client demo",
    description: "Client-side clarity copilot with speech transcript, notes, learning points, and decision preview."
  }
];

export const publicDemoAccounts = () =>
  demoAccounts.map(({ password: _password, ...account }) => account);

export const findDemoAccount = (accountIdOrEmail = "advisor-demo") =>
  demoAccounts.find((account) => account.accountId === accountIdOrEmail || account.email.toLowerCase() === accountIdOrEmail.toLowerCase());

export const toAuthUser = ({ id, email, name, role }: DemoAccount): AuthUser => ({ id, email, name, role });
