package edu.mit.csail.uid.turkit.gui;

import java.io.File;

import org.apache.commons.cli.*;

import edu.mit.csail.uid.turkit.TurKit;

public class CommandLineInterface {

	private static Options options = null;

	private static final String PROPERTIES_JSFILE_LOCATION_OPTION = "f";
	private static final String PROPERTIES_JSFILE_LOCATION_OPTION_LONG = "javascript-file";

	private static final String PROPERTIES_ACCESS_KEY_OPTION = "a";
	private static final String PROPERTIES_ACCESS_KEY_OPTION_LONG = "access-key";

	private static final String PROPERTIES_SECRET_KEY_OPTION = "s";
	private static final String PROPERTIES_SECRET_KEY_OPTION_LONG = "secret-key";

	private static final String PROPERTIES_MODE_OPTION = "m";
	private static final String PROPERTIES_MODE_OPTION_LONG = "mode";
	
	private static final String PROPERTIES_MAX_MONEY_OPTION = "o";
	private static final String PROPERTIES_MAX_MONEY_OPTION_LONG = "max-money";
	
	private static final String PROPERTIES_MAX_HITS_OPTION = "h";
	private static final String PROPERTIES_MAX_HITS_OPTION_LONG = "max-hits";

	static {
		options = new Options();
		options.addOption(PROPERTIES_JSFILE_LOCATION_OPTION,
				PROPERTIES_JSFILE_LOCATION_OPTION_LONG,
				true, "Javascript file location.");
		options.addOption(PROPERTIES_ACCESS_KEY_OPTION,
				PROPERTIES_ACCESS_KEY_OPTION_LONG,
				true, "Amazon AWS access key.");
		options.addOption(PROPERTIES_SECRET_KEY_OPTION,
				PROPERTIES_SECRET_KEY_OPTION_LONG,
				true, "Amazon AWS secret key.");
		options.addOption(PROPERTIES_MODE_OPTION,
				PROPERTIES_MODE_OPTION_LONG,
					true, "Mode in which to run - offline, sandbox, or real.");
		options.addOption(PROPERTIES_MAX_MONEY_OPTION,
				PROPERTIES_MAX_MONEY_OPTION_LONG,
				true, "Maximum money to spend.");
		options.addOption(PROPERTIES_MAX_HITS_OPTION,
				PROPERTIES_MAX_HITS_OPTION_LONG,
			true, "Maximum HITs to create.");
	}

	public void run(String args[]) throws Exception {
		CommandLine cmd = null;

		CommandLineParser parser = new PosixParser();

		try {
			cmd = parser.parse(options, args);
		} catch (ParseException e) {
			System.err.println("Error parsing arguments");
			e.printStackTrace();
			System.exit(1);
		}

		if (!cmd.hasOption(PROPERTIES_JSFILE_LOCATION_OPTION) ||
				!cmd.hasOption(PROPERTIES_ACCESS_KEY_OPTION) ||
				!cmd.hasOption(PROPERTIES_SECRET_KEY_OPTION) ||
				!cmd.hasOption(PROPERTIES_MODE_OPTION) ||
				!cmd.hasOption(PROPERTIES_MAX_MONEY_OPTION) ||
				!cmd.hasOption(PROPERTIES_MAX_HITS_OPTION)){

			HelpFormatter formatter = new HelpFormatter();

			formatter.printHelp("java -jar turkit.jar", options);
			System.exit(1);
		}

		TurKit tk = new TurKit(new File(cmd.getOptionValue(PROPERTIES_JSFILE_LOCATION_OPTION)),
								cmd.getOptionValue(PROPERTIES_ACCESS_KEY_OPTION),
								cmd.getOptionValue(PROPERTIES_SECRET_KEY_OPTION),
								cmd.getOptionValue(PROPERTIES_MODE_OPTION));

		double maxMoney = Double.parseDouble(cmd.getOptionValue(PROPERTIES_MAX_MONEY_OPTION));
		int maxHITs = Integer.parseInt(cmd.getOptionValue(PROPERTIES_MAX_HITS_OPTION));

		tk.runOnce(maxMoney, maxHITs);
	}
}
