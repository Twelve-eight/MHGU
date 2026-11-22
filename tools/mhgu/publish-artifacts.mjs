// Publish an explicit set of generated files. Same-directory rename protects each
// file; caught synchronous failures restore old files, not power-loss atomicity or
// concurrent reader/writer isolation. Failed rollback keeps named recovery files.
import path from 'node:path';

export function publishArtifacts(artifacts, io, log) {
  const staged = [];
  const cleanupErrors = [];
  const cleanup = entry => {
    try { io.rmSync(entry.dir, { recursive: true, force: true }); }
    catch (error) { cleanupErrors.push(new Error(`publication cleanup retained ${entry.dir}: ${error.message}`, { cause: error })); }
  };
  const reportCleanup = () => {
    const diagnosticErrors = [];
    for (const error of cleanupErrors) {
      try { log.error(error.message); }
      catch (diagnosticError) { diagnosticErrors.push(diagnosticError); }
    }
    return diagnosticErrors;
  };
  try {
    // Every text was serialized before entry. Stage all files before touching any
    // destination; a disk-full write can damage only this invocation's new file.
    for (const [target, text] of artifacts) {
      io.mkdirSync(path.dirname(target), { recursive: true });
      const dir = io.mkdtempSync(path.join(path.dirname(target), '.dttune-publish-'));
      const entry = { target, dir, fresh: path.join(dir, 'new'), old: path.join(dir, 'old'), backedUp: false, installed: false };
      staged.push(entry);
      io.writeFileSync(entry.fresh, text, { flag: 'wx' });
    }
    for (const entry of staged) {
      let existing;
      try { existing = io.lstatSync(entry.target); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (existing) {
        if (!existing.isFile()) throw new Error(`publication target is not a regular file: ${entry.target}`);
        io.renameSync(entry.target, entry.old);
        entry.backedUp = true;
      }
      io.renameSync(entry.fresh, entry.target);
      entry.installed = true;
    }
  } catch (error) {
    const failures = [];
    for (const entry of staged.toReversed()) {
      try {
        if (entry.installed) io.unlinkSync(entry.target);
        if (entry.backedUp) io.renameSync(entry.old, entry.target);
      } catch (restoreError) {
        failures.push(new Error(`recovery retained ${entry.dir} for ${entry.target}: ${restoreError.message}`, { cause: restoreError }));
        continue;
      }
      cleanup(entry);
    }
    const diagnosticErrors = reportCleanup();
    if (failures.length || diagnosticErrors.length) {
      const state = failures.length ? 'rollback incomplete' : 'old files restored; cleanup diagnostics failed';
      throw new AggregateError([error, ...failures, ...cleanupErrors, ...diagnosticErrors], `publication failed; ${state}: ${[...failures, ...cleanupErrors].map(e => e.message).join('; ')}`);
    }
    throw error;
  }
  for (const entry of staged) cleanup(entry);
  const diagnosticErrors = reportCleanup();
  if (diagnosticErrors.length) throw new AggregateError([...cleanupErrors, ...diagnosticErrors], `publication committed; cleanup diagnostics failed: ${cleanupErrors.map(e => e.message).join('; ')}`);
}
