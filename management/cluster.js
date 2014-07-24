function Monitor() {
  var _processes = [];
  var _process;
  var _port;
  var _debugPort;

  function setPort(port) {
    _port = port;
  }

  function getPort() {
    return _port;
  }
  
  function setDebugPort(debugPort) {
    _debugPort = debugPort;
  }

  function getDebugPort() {
    return _debugPort;
  }

  function setProcesses(processes) {
    _processes = processes;
  }
  
  function getProcesses() {
    return _processes;
  }

  function setProcess(process) {
    _process = process;
  }

  function getProcess() {
    return _process;
  }

  return {
    setPort: setPort,
    getPort: getPort,
    setDebugPort: setDebugPort,
    getDebugPort: getDebugPort,
    setProcess: setProcess,
    setProcesses: setProcesses,
    getProcess: getProcess,
    getProcesses: getProcesses
  };
}

module.exports = exports = new Monitor();
