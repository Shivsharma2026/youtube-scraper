import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { loadEnvFile, loadConfig } from './config.js';
import { parseArgs, parseYouTubeVideoInput } from './args.js';
import { YouTubeClient } from './youtube.js';
import { OpenAiSummarizer } from './openai.js';
import { LocalStore } from './storage.js';
import { runPipeline } from './pipeline.js';
import { createTranscriptFetcher } from './transcript-fetcher.js';
import { formatReport } from './reporter.js';

async function main() {
  loadEnvFile();

  const args = parseArgs();
  const selection = await resolveRunSelection(args);
  const config = loadConfig(process.env, process.cwd(), {
    requireChannels: !selection.video
  });
  const channelIds = selection.video ? [] : args.channel ? [args.channel] : config.channelIds;
  const videoIds = selection.video ? [selection.video] : [];

  const youtubeClient = new YouTubeClient({ apiKey: config.youtubeApiKey });
  const summarizer = new OpenAiSummarizer({
    apiKey: config.openAiApiKey,
    model: config.openAiModel,
    transcriptionModel: config.openAiTranscriptionModel
  });
  const store = new LocalStore({
    outputDir: config.outputDir,
    processedStorePath: config.processedStorePath
  });
  const transcriptFetcher = createTranscriptFetcher({
    transcriber: summarizer
  });

  const report = await runPipeline({
    channelIds,
    videoIds,
    limit: args.limit,
    force: args.force,
    youtubeClient,
    summarizer,
    store,
    transcriptFetcher
  });

  const output = formatReport(report, args.output);
  const writer = report.hasErrors && args.output !== 'json' ? process.stderr : process.stdout;
  writer.write(output);

  if (report.hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function resolveRunSelection(args) {
  if (args.video) {
    return {
      video: args.video
    };
  }

  if (!input.isTTY || !output.isTTY) {
    return {
      video: null
    };
  }

  const rl = createInterface({ input, output });

  try {
    output.write('How do you want to run youtube-scraper?\n');
    output.write('1) Search preset channels\n');
    output.write('2) Give me the link to the video\n');
    const choice = (await rl.question('Choose 1 or 2: ')).trim();

    if (choice === '1' || choice === '') {
      return {
        video: null
      };
    }

    if (choice === '2') {
      const link = await rl.question('Paste the YouTube video link: ');
      return {
        video: parseYouTubeVideoInput(link)
      };
    }

    throw new Error('Invalid selection. Choose 1 for preset channels or 2 for a video link.');
  } finally {
    rl.close();
  }
}
