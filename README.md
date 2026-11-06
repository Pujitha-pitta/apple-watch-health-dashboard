# Pulseboard — Apple Health Analytics

A local-first dashboard for exploring Apple Health activity and recovery trends. It starts with clearly labeled synthetic demo data and can import a user's Apple Health XML export or a daily-summary CSV directly in the browser.

## Run it

Open `index.html` in a modern browser. No build step, account, server, external analytics, or API key is required. Google Fonts are an optional visual enhancement; the dashboard has system font fallbacks.

## Import an Apple Health export

1. On iPhone, open the Health app, tap the profile picture, choose **Export All Health Data**, and save or transfer the resulting ZIP to the computer.
2. Extract the ZIP and select `export.xml` in Pulseboard using **Import health data**.
3. The browser parses the file locally. The file is not sent to a server. Refreshing the page returns to synthetic demo data; imported health data is not persisted.

The XML import currently reads step count, active energy, Apple exercise minutes, resting heart rate, heart rate, asleep-stage records, and workouts. It can be CPU- and memory-intensive for very large exports because browser XML parsing loads the export into memory. The source selector shows records whose Apple Health source name contains “Watch”.

## CSV format

Daily summary CSV files can use these columns (all are optional except `date`):

```csv
date,steps,active_energy,exercise_minutes,resting_heart_rate,sleep_hours,source
2026-11-01,8420,412,38,60,7.4,Apple Watch
```

## Dashboard features

- Steps, active energy, exercise minutes, resting heart rate, and sleep duration
- Seven- and thirty-day views, trend comparisons, visual charts, and a plain-language observation
- Source filter for Apple Watch readings
- Editable personal step, exercise, and sleep goals, saved only in local browser storage
- Workout totals and recent sessions parsed from Apple Health XML
- Local XML/CSV import with synthetic demo data on first load
- Responsive layout and no health-data upload or account requirement

## Limitations

This is an independent web project, not an Apple product. A browser cannot read HealthKit directly from an Apple Watch; users must export data from the Health app. The dashboard does not provide medical advice or diagnosis. This repository does not contain personal health data.
