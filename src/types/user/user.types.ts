import { RegularTask } from "../task";
import { Session, User } from "@entities";

export type RegularUser = Pick<
  User,
  "id" | "name" | "role" | "lastVisitAt" | "createdAt" | "updatedAt"
>;

export type ExtendedUser = RegularUser & {
  sessions: Pick<Session, "id" | "lastVisitAt" | "createdAt" | "updatedAt">[];
  tasks: RegularTask[];
};
