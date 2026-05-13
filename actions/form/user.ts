"use server";

import { createClient } from "@/utils/supabase/server";
import { notifyAllAdmins } from "@/actions/notifications/internal";

export interface AnimalReportInsert {
	report_title?: string;       // text
	reporter_name?: string;      // text
	animal_name?: string;        // text
	animal_type?: string;        // 'cat' | 'dog' | 'other'
	animal_gender?: string;      // 'unknown' | 'male' | 'female'
	date_seen?: string;          // ISO timestamptz string or null
	animal_description?: string; // text
	area?: string;
	landmark?: string;
	road?: string;
	health_issues?: string;      // new column: null or description if issues
	animal_collar?: string;      // new column: null or description if collar present
	other_information?: string;  // new column: additional info
	latitude: number;            // float8
	longitude: number;           // float8
	photo?: File;                // Image file to upload
}

async function uploadAnimalPhoto(file: File, reportId: number): Promise<string | null> {
	const supabase = await createClient();
	
	// Create a unique filename: reportId_timestamp.extension
	const fileExt = file.name.split('.').pop();
	const fileName = `${reportId}_${Date.now()}.${fileExt}`;
	const filePath = `animal-reports/${fileName}`;

	const { error: uploadError } = await supabase.storage
		.from('Animal Photos') // Using your existing bucket name
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: false
		});

	if (uploadError) {
		console.error('Photo upload error:', uploadError);
		return null;
	}

	// Get public URL from Supabase Storage for Animal Photos bucket
	const { data: { publicUrl } } = supabase.storage
		.from('Animal Photos')
		.getPublicUrl(filePath);

	return publicUrl;
}

export async function createAnimalReport(data: AnimalReportInsert) {
	const supabase = await createClient();

	// Get current user to set reporter_id implicitly (RLS relies on auth.uid())
	const { data: { user }, error: userError } = await supabase.auth.getUser();
	if (userError || !user) {
		return { success: false, error: "Not authenticated" };
	}

	const insertPayload = {
		user_id: user.id,
		report_title: data.report_title ?? null,
		reporter_name: data.reporter_name ?? null,
		animal_name: data.animal_name ?? null,
		animal_type: data.animal_type ?? 'other',
		animal_gender: data.animal_gender ?? 'unknown',
		date_seen: data.date_seen ?? null,
		animal_description: data.animal_description ?? null,
		area: data.area ?? null,
		landmark: data.landmark ?? null,
		road: data.road ?? null,
		health_issues: data.health_issues ?? null,
		animal_collar: data.animal_collar ?? null,
		other_information: data.other_information ?? null,
		latitude: data.latitude,
		longitude: data.longitude
	} as const;

	const { data: inserted, error } = await supabase
		.from('animal_report')
		.insert(insertPayload)
		.select('report_id')
		.single();

	if (error) {
		console.error('createAnimalReport error', error);
		return { success: false, error: error.message };
	}

	// Notify admins (best-effort)
	try {
		const notifyRes = await notifyAllAdmins({
			sender_id: user.id,
			event_type: 'animal_report.created',
			priority: 'high',
			title: 'New animal report submitted',
			message: `A new animal report was submitted${data.report_title ? `: ${data.report_title}` : '.'}`,
			entity_type: 'animal_report',
			entity_id: String(inserted.report_id),
		});
		if (notifyRes.inserted === 0) {
			console.warn('[createAnimalReport] Admin notification not inserted (0 recipients).', {
				report_id: inserted.report_id,
			});
		}
	} catch (e) {
		console.error('Failed to notify admins (animal_report.created):', e);
	}

	// If photo is provided, upload it and update the report
	if (data.photo && inserted?.report_id) {
		const photoUrl = await uploadAnimalPhoto(data.photo, inserted.report_id);
		if (photoUrl) {
			// Update the report with the photo URL and check for errors
			const { error: photoUpdateError } = await supabase
				.from('animal_report')
				.update({ photo_url: photoUrl })
				.eq('report_id', inserted.report_id);
			if (photoUpdateError) {
				console.error('Failed to update photo_url:', photoUpdateError);
				return { success: false, error: 'Photo uploaded but failed to update report with photo URL.' };
			}
			// Optionally, re-fetch the updated report to confirm
			// const { data: updatedReport } = await supabase
			//     .from('animal_report')
			//     .select('photo_url')
			//     .eq('report_id', inserted.report_id)
			//     .single();
			// return { success: true, reportId: inserted.report_id, photo_url: updatedReport?.photo_url };
		} else {
			return { success: false, error: 'Photo upload failed.' };
		}
	}

	return { success: true, reportId: inserted?.report_id };
}

