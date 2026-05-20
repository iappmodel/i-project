class CommandEngine {
  final Map<String, Function> commands = {};

  void register(String name, Function action) {
    commands[name] = action;
  }

  void execute(String name) {
    if (commands.containsKey(name)) {
      commands[name]!();
    }
  }
}
