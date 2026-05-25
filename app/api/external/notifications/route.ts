import { NextRequest, NextResponse } from 'next/server';
import {
	publishAdminAdoptionApplicationStatusChangedExternal,
	publishAdminAdoptionApplicationSubmittedExternal,
	publishAnimalReportStatusChangedExternal,
	publishAnimalReportSubmittedExternal,
} from '@/utils/aws/sns';

export const runtime = 'nodejs';

type ExternalNotificationBody = {
	event_type?: string | null;
	report_id?: string | null;
	report_title?: string | null;
	submitter_id?: string | null;
	old_status?: string | null;
	new_status?: string | null;
	application_id?: string | null;
	applicant_name?: string | null;
	animal_id?: string | null;
};

function json(status: number, body: unknown) {
	return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
	try {
		const expectedApiKey = process.env.INTERNAL_NOTIFICATION_API_KEY;
		if (!expectedApiKey) {
			return json(500, {
				ok: false,
				error: 'INTERNAL_NOTIFICATION_API_KEY not configured',
			});
		}

		const providedApiKey = request.headers.get('x-internal-api-key');
		if (!providedApiKey || providedApiKey !== expectedApiKey) {
			return json(401, { ok: false, error: 'Unauthorized' });
		}

		let body: ExternalNotificationBody;
		try {
			body = (await request.json()) as ExternalNotificationBody;
		} catch {
			return json(400, { ok: false, error: 'Invalid JSON body' });
		}

		const eventType = body.event_type?.trim();
		if (!eventType) {
			return json(400, { ok: false, error: '`event_type` is required' });
		}

		switch (eventType) {
			case 'animal_report.created': {
				const reportId = body.report_id?.trim();
				if (!reportId) {
					return json(400, { ok: false, error: '`report_id` is required' });
				}
				if (!body.submitter_id?.trim()) {
					return json(400, { ok: false, error: '`submitter_id` is required for animal_report.created' });
				}

				await publishAnimalReportSubmittedExternal({
					reportId,
					reportTitle: body.report_title ?? null,
					submitterId: body.submitter_id,
				});

				return json(200, { ok: true, dispatched: true, event_type: eventType });
			}
			case 'animal_report.status_changed': {
				const reportId = body.report_id?.trim();
				if (!reportId) {
					return json(400, { ok: false, error: '`report_id` is required' });
				}
				await publishAnimalReportStatusChangedExternal({
					reportId,
					reportTitle: body.report_title ?? null,
					submitterId: body.submitter_id ?? null,
					oldStatus: body.old_status ?? null,
					newStatus: body.new_status ?? null,
				});

				return json(200, { ok: true, dispatched: true, event_type: eventType });
			}
			case 'adoption_application.created': {
				const applicationId = body.application_id?.trim();
				const animalId = body.animal_id?.trim();
				if (!applicationId) {
					return json(400, { ok: false, error: '`application_id` is required' });
				}
				if (!animalId) {
					return json(400, { ok: false, error: '`animal_id` is required for adoption_application.created' });
				}

				await publishAdminAdoptionApplicationSubmittedExternal({
					applicationId,
					animalId,
					applicantName: body.applicant_name ?? null,
				});

				return json(200, { ok: true, dispatched: true, event_type: eventType });
			}
			case 'adoption_application.status_changed': {
				const applicationId = body.application_id?.trim();
				const animalId = body.animal_id?.trim();
				if (!applicationId) {
					return json(400, { ok: false, error: '`application_id` is required' });
				}
				if (!animalId) {
					return json(400, { ok: false, error: '`animal_id` is required for adoption_application.status_changed' });
				}

				await publishAdminAdoptionApplicationStatusChangedExternal({
					applicationId,
					animalId,
					applicantName: body.applicant_name ?? null,
					oldStatus: body.old_status ?? null,
					newStatus: body.new_status ?? null,
				});

				return json(200, { ok: true, dispatched: true, event_type: eventType });
			}
			default:
				return json(400, {
					ok: false,
					error: `Unsupported event_type: ${eventType}`,
				});
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unexpected error';
		return json(500, { ok: false, error: message });
	}
}