import "server-only";

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

type Audience = "admin" | "user";

type PublishExternalParams = {
  topicArn: string;
  subject: string;
  message: string;
  attributes: Record<string, string | undefined | null>;
};

let snsClient: SNSClient | null = null;
let didWarnMissingConfig = false;

function parseCsvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getBaseUrl(): string | null {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

function absoluteUrl(path: string): string {
  const base = getBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function adminAbsoluteUrl(path: string): string {
  const base = "https://pawject-patrol.d1bjfxqn6lx7l.amplifyapp.com";
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getSnsClient(): SNSClient | null {
  // Use only the Amplify-safe per-service env vars for SNS.
  const region = process.env.PAWJECT_AWS_REGION_SNS;
  const accessKeyId = process.env.PAWJECT_AWS_ACCESS_KEY_ID_SNS;
  const secretAccessKey = process.env.PAWJECT_AWS_SECRET_ACCESS_KEY_SNS;

  if (!region) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing PAWJECT_AWS_REGION_SNS. External notifications are disabled."
      );
    }
    return null;
  }

  if (snsClient) return snsClient;

  // If explicit env credentials are provided, use them.
  // Otherwise, fall back to the default AWS credential provider chain
  // (e.g. ~/.aws/credentials from `aws configure`, ECS/EC2 role, etc.).
  if (!accessKeyId || !secretAccessKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[sns] PAWJECT AWS SNS credentials not set; external notifications will use the default AWS credential provider chain if available."
    );
    snsClient = new SNSClient({ region });
  } else {
    snsClient = new SNSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return snsClient;
}

export function getAdminSmsNumbersFromEnv(): string[] {
  return parseCsvList(process.env.ADMIN_SMS_NUMBERS);
}

export async function sendSmsExternal(params: {
  phoneNumber: string;
  message: string;
}): Promise<boolean> {
  const client = getSnsClient();
  if (!client) return false;

  const phoneNumber = params.phoneNumber?.trim();
  if (!phoneNumber) return false;

  try {
    await client.send(
      new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: params.message,
      })
    );
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[sns] Failed to send SMS:", e);
    return false;
  }
}

async function publishExternal({
  topicArn,
  subject,
  message,
  attributes,
}: PublishExternalParams): Promise<boolean> {
  const client = getSnsClient();
  if (!client) return false;

  const MessageAttributes: Record<
    string,
    { DataType: "String"; StringValue: string }
  > = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (!value) continue;
    MessageAttributes[key] = { DataType: "String", StringValue: String(value) };
  }

  try {
    await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: subject,
        Message: message,
        MessageAttributes,
      })
    );
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[sns] Failed to publish SNS message:", e);
    return false;
  }
}

function getTopicArn(
  kind:
    | "report_submitted"
    | "report_status_changed"
    | "adoption_submitted"
    | "adoption_status_changed"
    | "volunteer_updates"
): string | null {
  if (kind === "report_submitted") return process.env.SNS_TOPIC_REPORT_SUBMITTED_ARN || null;
  if (kind === "report_status_changed") return process.env.SNS_TOPIC_REPORT_STATUS_CHANGED_ARN || null;
  if (kind === "adoption_submitted") return process.env.SNS_TOPIC_ADOPTION_SUBMITTED_ARN || null;
  if (kind === "adoption_status_changed") return process.env.SNS_TOPIC_ADOPTION_STATUS_CHANGED_ARN || null;
  return (
    process.env.SNS_TOPIC_VOLUNTEER_UPDATES_ARN ||
    process.env.SNS_TOPIC_REPORT_VOLUNTEER_UPDATES_ARN ||
    process.env.SNS_TOPIC_REPORT_VOLUNTEER_CALL_UPDATES_ARN ||
    null
  );
}

export async function publishAdminVolunteerCallJoinedExternal(params: {
  callId: string;
  callTitle?: string | null;
  userDisplayName?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("volunteer_updates");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing volunteer SNS topic ARN. Set SNS_TOPIC_VOLUNTEER_UPDATES_ARN, SNS_TOPIC_REPORT_VOLUNTEER_UPDATES_ARN, or SNS_TOPIC_REPORT_VOLUNTEER_CALL_UPDATES_ARN."
      );
    }
    return;
  }

  const callTitlePart = params.callTitle?.trim() ? `: ${params.callTitle.trim()}` : "";
  const userName = params.userDisplayName?.trim() || "A user";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: New volunteer signup",
    message: `${userName} joined volunteer call${callTitlePart}.\n\nAdmin link: ${adminAbsoluteUrl(
      `/admin/volunteer/${params.callId}`
    )}\nCall ID: ${params.callId}`,
    attributes: {
      ...baseAttributes({
        eventType: "volunteer_call.joined",
        audience: "admin",
        entityType: "volunteer_call",
        entityId: params.callId,
        priority: "normal",
      }),
    },
  });
}

export async function publishAdminVolunteerCallLeftExternal(params: {
  callId: string;
  callTitle?: string | null;
  userDisplayName?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("volunteer_updates");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing volunteer SNS topic ARN. Set SNS_TOPIC_VOLUNTEER_UPDATES_ARN, SNS_TOPIC_REPORT_VOLUNTEER_UPDATES_ARN, or SNS_TOPIC_REPORT_VOLUNTEER_CALL_UPDATES_ARN."
      );
    }
    return;
  }

  const callTitlePart = params.callTitle?.trim() ? `: ${params.callTitle.trim()}` : "";
  const userName = params.userDisplayName?.trim() || "A user";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Volunteer left a call",
    message: `${userName} left volunteer call${callTitlePart}.\n\nAdmin link: ${adminAbsoluteUrl(
      `/admin/volunteer/${params.callId}`
    )}\nCall ID: ${params.callId}`,
    attributes: {
      ...baseAttributes({
        eventType: "volunteer_call.left",
        audience: "admin",
        entityType: "volunteer_call",
        entityId: params.callId,
        priority: "normal",
      }),
    },
  });
}

function baseAttributes(params: {
  eventType: string;
  audience: Audience;
  recipientId?: string | null;
  entityType: string;
  entityId: string;
  priority?: "high" | "normal" | "low";
}) {
  return {
    event_type: params.eventType,
    audience: params.audience,
    recipient_id: params.recipientId ?? undefined,
    entity_type: params.entityType,
    entity_id: params.entityId,
    priority: params.priority ?? "normal",
  };
}

export async function publishAnimalReportSubmittedExternal(params: {
  reportId: string;
  reportTitle?: string | null;
  submitterId: string;
}): Promise<void> {
  const topicArn = getTopicArn("report_submitted");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_REPORT_SUBMITTED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const titlePart = params.reportTitle?.trim() ? `: ${params.reportTitle.trim()}` : "";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: New animal report submitted",
    message: `A new animal report was submitted${titlePart}.\n\nAdmin link: ${adminAbsoluteUrl(
      `/admin/report/${params.reportId}`
    )}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.created",
        audience: "admin",
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
    },
  });

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Your report was submitted",
    message: `Your animal report was submitted${titlePart}.\n\nYou can check updates here: ${absoluteUrl(
      `/notifications`
    )}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.created",
        audience: "user",
        recipientId: params.submitterId,
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
    },
  });
}

export async function publishAdminAnimalReportSubmittedExternal(params: {
  reportId: string;
  reportTitle?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("report_submitted");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_REPORT_SUBMITTED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const titlePart = params.reportTitle?.trim() ? `: ${params.reportTitle.trim()}` : "";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: New animal report submitted",
    message: `A new animal report was submitted${titlePart}.\n\nAdmin link: ${adminAbsoluteUrl(`/admin/report/${params.reportId}`)}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.created",
        audience: "admin",
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
    },
  });
}

export async function publishAnimalReportStatusChangedExternal(params: {
  reportId: string;
  reportTitle?: string | null;
  submitterId?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("report_status_changed");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_REPORT_STATUS_CHANGED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const titlePart = params.reportTitle?.trim() ? `: ${params.reportTitle.trim()}` : "";
  const oldStatus = params.oldStatus ?? "Unknown";
  const newStatus = params.newStatus ?? "Unknown";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Animal report status changed",
    message: `Animal report${titlePart} status changed from ${oldStatus} to ${newStatus}.\n\nAdmin link: ${adminAbsoluteUrl(
      `/admin/report/${params.reportId}`
    )}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.status_changed",
        audience: "admin",
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
      old_status: oldStatus,
      new_status: newStatus,
    },
  });

  if (!params.submitterId) return;

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Your report status was updated",
    message: `Your animal report${titlePart} status changed to ${newStatus}.\n\nYou can check updates here: ${absoluteUrl(
      `/notifications`
    )}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.status_changed",
        audience: "user",
        recipientId: params.submitterId,
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
      old_status: oldStatus,
      new_status: newStatus,
    },
  });
}

export async function publishAdminAnimalReportStatusChangedExternal(params: {
  reportId: string;
  reportTitle?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("report_status_changed");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_REPORT_STATUS_CHANGED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const titlePart = params.reportTitle?.trim() ? `: ${params.reportTitle.trim()}` : "";
  const oldStatus = params.oldStatus ?? "Unknown";
  const newStatus = params.newStatus ?? "Unknown";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Animal report status changed",
    message: `Animal report${titlePart} status changed from ${oldStatus} to ${newStatus}.\n\nAdmin link: ${adminAbsoluteUrl(`/admin/report/${params.reportId}`)}\nReport ID: ${params.reportId}`,
    attributes: {
      ...baseAttributes({
        eventType: "animal_report.status_changed",
        audience: "admin",
        entityType: "animal_report",
        entityId: params.reportId,
        priority: "high",
      }),
      old_status: oldStatus,
      new_status: newStatus,
    },
  });
}

export async function publishAdminAdoptionApplicationSubmittedExternal(params: {
  applicationId: string;
  animalId: string;
  animalName?: string | null;
  applicantName?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("adoption_submitted");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_ADOPTION_SUBMITTED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const applicantName = params.applicantName?.trim() || "A user";
  const animalLabel = params.animalName?.trim() || `Animal ${params.animalId}`;

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: New adoption application submitted",
    message: `${applicantName} submitted an adoption application for ${animalLabel}.\n\nAdmin dashboard: ${adminAbsoluteUrl("/admin")}\nApplication ID: ${params.applicationId}\nAnimal ID: ${params.animalId}\nAnimal: ${animalLabel}`,
    attributes: {
      ...baseAttributes({
        eventType: "adoption_application.created",
        audience: "admin",
        entityType: "adoption_application",
        entityId: params.applicationId,
        priority: "high",
      }),
      animal_id: params.animalId,
      animal_name: params.animalName?.trim() || undefined,
    },
  });
}

export async function publishAdminAdoptionApplicationStatusChangedExternal(params: {
  applicationId: string;
  animalId: string;
  animalName?: string | null;
  applicantName?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
}): Promise<void> {
  const topicArn = getTopicArn("adoption_status_changed");
  if (!topicArn) {
    if (!didWarnMissingConfig) {
      didWarnMissingConfig = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[sns] Missing SNS_TOPIC_ADOPTION_STATUS_CHANGED_ARN. External notifications are disabled."
      );
    }
    return;
  }

  const applicantName = params.applicantName?.trim() || "A user";
  const animalLabel = params.animalName?.trim() || `Animal ${params.animalId}`;
  const oldStatus = params.oldStatus ?? "Pending";
  const newStatus = params.newStatus ?? "Unknown";

  await publishExternal({
    topicArn,
    subject: "Pawject Patrol: Adoption application status changed",
    message: `${applicantName}'s adoption application for ${animalLabel} status changed from ${oldStatus} to ${newStatus}.\n\nAdmin dashboard: ${adminAbsoluteUrl("/admin")}\nApplication ID: ${params.applicationId}\nAnimal ID: ${params.animalId}\nAnimal: ${animalLabel}`,
    attributes: {
      ...baseAttributes({
        eventType: "adoption_application.status_changed",
        audience: "admin",
        entityType: "adoption_application",
        entityId: params.applicationId,
        priority: "high",
      }),
      animal_id: params.animalId,
      animal_name: params.animalName?.trim() || undefined,
      old_status: oldStatus,
      new_status: newStatus,
    },
  });
}
