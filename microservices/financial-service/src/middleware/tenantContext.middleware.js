function getHeader(req, key) {
  return req.headers[key] || req.headers[key.toLowerCase()] || req.headers[key.toUpperCase()];
}

function enforceTenantContext(req, res, next) {
  if (process.env.STRICT_TENANT_CONTEXT !== 'true') {
    return next();
  }

  const tenantHeader = getHeader(req, 'x-tenant-id');
  const companyHeader = getHeader(req, 'x-company-id');
  const userTenant = req.user?.tenantId || req.user?.tenant_id;
  const userCompany = req.user?.companyId || req.user?.company_id;

  if (!tenantHeader || !companyHeader) {
    return res.status(400).json({
      success: false,
      message: 'x-tenant-id and x-company-id are required'
    });
  }

  if (userTenant && String(userTenant) !== String(tenantHeader)) {
    return res.status(403).json({
      success: false,
      message: 'Tenant mismatch between JWT and header'
    });
  }

  if (userCompany && String(userCompany) !== String(companyHeader)) {
    return res.status(403).json({
      success: false,
      message: 'Company mismatch between JWT and header'
    });
  }

  return next();
}

module.exports = { enforceTenantContext };
